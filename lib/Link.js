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
      lruMaxAgeLookup: 5000
    }

    _.extend(this.conf, conf)
  }

  init() {
    this._inited = true
    this.cache = {}
    this.kueue0 = new Kueue()
    this._reqs = new Map()

    this._connItv = setInterval(() => {
      if (this._connected || this._connecting) return
      this.connect()
    }, 2500)
  }

  onMessage(msg) {
    msg = JSON.parse(msg)
    this.handleReply(msg[0], null, msg[1], uuid.v4(), true)
  }

  connect() {
    if (this._socket) {
      this.disconnect()
    }

    const addr = this.conf.grape

    this._connecting = true

    this._socket = new WS(addr)
    this._socket.on('open', () => {
      this._connected = true
      this._connecting = false
      this.emit('connect')
    })

    this._socket.on('message', this.onMessage.bind(this))

    this._socket.on('close', () => {
      this.disconnect()
    })
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

  getRequestHash(type, payload) {
    return `${type}${JSON.stringify(payload)}`
  }

  request(type, payload, opts, cb) {
    if (!this._connected) {
      return cb('ERR_GRAPE_READY')
    }

    const cache = this.cache[type]

    if (cache) {
      const qhash = this.getRequestHash(type, payload)
      const [cval, gid] = cache.get(qhash) || []

      if (cval) {
        cb(null, cval, gid)
        return
      }
    }

    const req = this.newRequest(type, payload, opts, cb)
    this.addRequest(req)

    this.kueue0.push(req.qhash, (err, data, gid) => {
      this.handleReply(req.rid, err, data, gid)
    })

    if (this.kueue0.cnt(req.qhash) > 1) {
      return
    }
      
    this._socket.send(JSON.stringify([req.rid, req.type, req.payload]))
  }

  handleReply(rid, err, data, gid, fromGrape = false) {
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
        let cache = this.cache[req.type]
        if (cache) {
          cache.set(req.qhash, [data, gid])
        }
      }

      this.kueue0.trigger(req.qhash, err, data, gid)
      return
    }
  
    this.delRequest(req)
     
    req.cb(err, data, gid)
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

    req.qhash = this.getRequestHash(type, payload)

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
    this.request('lookup', key, opts, (err, res, gid) => {
      if (err) {
        cb(err)
        return
      }

      if (!_.isArray(res) || !res.length) {
        cb('ERR_GRAPE_LOOKUP_EMPTY')
        return
      }

      cb(null, res, gid)
    })
  }

  announce(key, port, opts, cb) {
    if (!cb) cb = () => {}
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
        this.handleReply(req.rid, 'ERR_TIMEOUT', null, req.rid, false)
      }
    })

    if (this._pingPending) return
    this._pingPending = true

    this.request(
      'lookup', 'grenache:ping', { timeout: 1000 },
      (err, res) => {
        this._pingPending = false
        if (err) {
          debug(`Link error ${this.conf.grape}: ${er}`)
          this.disconnect()
        }
      }
    )
  }

  start() {
    if (!this._inited) {
      this.init()
    }

    this.stop()
    
    this._monitorItv = setInterval(this.monitor.bind(this), 10000)

    _.each(['lookup'], fld => {
      let cfld = _.upperFirst(_.camelCase(`-${fld}`))

      this.cache[fld] = new LRU({
        max: this.conf[`lruMaxSize${cfld}`],
        maxAge: this.conf[`lruMaxAge${cfld}`]
      })
    })

    this.connect()
  }

  stop() {
    _.each(['monitor', 'connect'], k => {
      const vp = `_${k}`
      clearInterval(this[vp])
      delete this[vp]
    })

    this.disconnect()

    _.each(this.cache, c => {
      cache.clear()
    })
  }
}

module.exports = Link
