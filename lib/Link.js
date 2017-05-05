'use strict'

const _ = require('lodash')
const uuid = require('uuid')
const async = require('async')
const debug = require('debug')
const Events = require('events')
const LRU = require('lru')
const WS = require('uws')
const Kueue = require('./Kueue')

class Link extends Events {
  
  constructor(conf) {
    super()

    this.conf = {
      grape: '',
      lruMaxSizeLookup: 1000,
      lruMaxAgeLookup: 2000
    }

    _.extend(this.conf, conf)
  }

  init() {
    this._inited = true
    this.cache = new Map()
    this.kueue0 = new Kueue()
    this._reqs = new Map()
  }

  onMessage(msg) {
    msg = JSON.parse(msg)
    this.handleReply(msg[0], null, msg[1], true)
  }

  connect() {
    if (this._socket) {
      this.disconnect()
    }

    const addr = this.conf.grape

    this._socket = new WS(addr)
    this._socket.on('open', () => {
      this._connected = true
      this.emit('connect')
    })

    this._socket.on('message', this.onMessage.bind(this))

    this._socket.on('close', () => {
      this.disconnect()
      setTimeout(() => {
        this.connect()
      }, 5000)
    })

    setTimeout(() => {
      if (this._connected) return
      this.connect()
    }, 2500)
  }

  disconnect() {
    if (this._socket) {
      this._connected = false
      this._socket.removeListener('message', this.onMessage.bind(this))
      try { this._socket.close() } catch(e) {}
      delete this._socket
    }
    this.emit('disconnect')
  }

  request(type, payload, opts, cb) {
    if (!this._connected) {
      return cb('ERR_GRAPE_READY')
    }

    const cache = this.cache.get(type)

    if (cache) {
      const plhash = JSON.stringify(payload)
      const cval = cache.get(plhash)

      if (cval) {
        cb(null, cval)
        return
      }
    }

    const req = this.newRequest(type, payload, opts, cb)
    this.addRequest(req)

    this.kueue0.push(req.qhash, (err, data) => {
      this.handleReply(req.rid, err, data)
    })

    if (this.kueue0.cnt(req.qhash) > 1) {
      return
    }
      
    this._socket.send(JSON.stringify([req.rid, req.type, req.payload]))
  }

  handleReply(rid, err, data, fromGrape = false) {
    const req = this._reqs.get(rid)
    if (!req) return
  
    if (fromGrape) {
      if (!err) {
        if (_.isString(data) && _.startsWith(data, 'ERR_')) {
          err = data
          data = null
        }
      }
      
      if (!err && data) {
        let cache = this.cache.get(req.type)
        if (cache) {
          cache.set(req.payload, data)
        }
      }

      this.kueue0.trigger(req.qhash, err, data)
      return
    }
  
    this.delRequest(req)
    
    req.cb(err, data)
  }

  newRequest(type, payload, _opts, cb) {
    const rid = uuid.v4()

    const opts = _.extend({
      timeout: 10000
    }, _opts)

    const req = {
      rid: rid,
      type: type,
      payload: payload,
      opts: opts,
      cb: _.isFunction(cb) ? cb : () => {},
      _ts: Date.now() 
    }

    const qhash = `${type}${JSON.stringify(payload)}`
    req.qhash = qhash

    return req
  }

  addRequest(req) {
    this._reqs.set(req.rid, req)
  }

  delRequest(req) {
    this._reqs.delete(req.rid)
  }

  getRequest(rid) {
    return this._reqs.get(rid)
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

  put(opts, cb) {
    this.request('put', opts, {}, cb)
  }

  get(hash, cb) {
    this.request('get', hash, {}, cb)
  }

  monitor() {
    const now = Date.now()

    this._reqs.forEach(req => {
      if (now > req._ts + req.opts.timeout) {
        this.handleReply(req.rid, 'ERR_TIMEOUT', null, false)
      }
    })
  }

  start() {
    if (!this._inited) {
      this.init()
    }

    this.stop()
    
    this._monitorItv = setInterval(this.monitor.bind(this), 10000)

    _.each(['lookup'], fld => {
      let cfld = _.upperFirst(_.camelCase(`-${fld}`))

      this.cache.set(fld, new LRU({
        max: this.conf[`lruMaxSize${cfld}`],
        maxAge: this.conf[`lruMaxAge${cfld}`]
      }))
    })

    this.connect()
  }

  stop() {
    if (this._monitorItv) {
      clearInterval(this._monitorItv)
      this._monitorItv = null
    }

    this.disconnect()

    this.cache.forEach(cache => {
      cache.clear()
    })
    
    this.cache.clear()
  }
}

module.exports = Link
