'use strict'

var _ = require('lodash')
var _s = require('underscore.string')
var uuid = require('uuid')
var async = require('async')
var debug = require('debug')
var Events = require('events')
var LRU = require('lru')
var WS = require('ws')

class Link extends Events {
  
  constructor(conf) {
    super()

    this.conf = {
      grape: '',
      lruMaxSizeLookup: 1000,
      lruMaxAgeLookup: 2000
    }

    _.extend(this.conf, conf)

    this._caches = {}
    this._queues = new Map()
    this._reqs = new Map()
  }

  connect() {
    this.disconnect()
    var addr = this.conf.grape

    this._socket = new WS(addr)
    this._socket.on('open', () => {
      this.emit('connect')
    })

    this._socket.on('message', msg => {
      msg = JSON.parse(msg)
      this.handleReply(msg[0], null, msg[1])
    })
  }

  disconnect() {
    if (this._socket) {
      this._socket.close()
    }
    this.emit('disconnect')
  }

  request(type, payload, opts, cb) {
    var cache = this._caches[type]

    if (cache) {
      let plhash = JSON.stringify(payload)
      let cval = cache.get(plhash)

      if (cval) {
        cb(null, cval)
        return
      }
    }

    var req = this.newReq(type, payload, opts)

    if (!this._queues.has(req.qhash)) {
      this._queues.set(req.qhash, [])
    }

    var rqueue = this._queues.get(req.qhash)
    rqueue.push([req.rid, cb])

    if (rqueue.length > 1) {
      return
    }
    console.log(req.payload)
      
    this._socket.send(JSON.stringify([req.rid, req.type, req.payload]))
  }

  handleReply(rid, err, _data) {
    var req = this._reqs.get(rid)
    if (!req) {
      return
    }

    var now = new Date()
    var data = _data

    if (!err) {
      if (_.isString(data) && _s.startsWith(data, 'ERR_')) {
        err = data
        data = null
      }
    }

    //console.log('[' + req.type + '] ' + (now - req._ts) + 'ms')
  
    if (!err && data) {  
      let cache = this._caches[req.type]
      if (cache) {
        cache.set(req.payload, data)
      }
    }

    let rqueue = this._queues.get(req.qhash)

    if (rqueue) {
      _.each(rqueue, rv => {
        this._reqs.delete(rv[0])
        if (rv[1]) {
          rv[1](err, data)
        }
      })
      this._queues.delete(req.qhash)
    }
  }

  newReq(type, payload, opts) {
    var rid = uuid.v4()

    var req = {
      rid: rid,
      type: type,
      payload: payload,
      opts: opts,
      _ts: (new Date()).getTime()
    }

    var qhash = type + JSON.stringify(payload)
    req.qhash = qhash

    this._reqs.set(rid, req)

    return req
  }

  lookup(key, opts, cb) {
    this.request('lookup', key, opts, (err, res) => {
      if (err) {
        cb(err)
        return
      }

      if (!_.isArray(res) || !res.length) {
        cb('ERR_GRAPE_LOOKUP_EMPTY')
        return
      }

      cb(null, res)
    })
  }

  announce(key, port, opts, cb) {
    this.request('announce', [key, port], opts, cb)
  }

  start() {
    this.stop()   
    this.connect()
  }

  stop() {
    this.disconnect()

    _.each(['lookup'], fld => {
      let cfld = _s.camelize('-' + fld)

      this._caches[fld] = new LRU({
        max: this.conf['lruMaxSize' + cfld],
        maxAge: this.conf['lruMaxAge' + cfld]
      })
    })
  }
}

module.exports = Link
