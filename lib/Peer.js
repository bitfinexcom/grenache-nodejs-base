'use strict'

const Events = require('events')
const uuid = require('uuid')
const _ = require('lodash')
const Transport = require('./Transport')

class Peer extends Events {
  
  constructor(link, conf) {
    super()

    this.conf = _.extend({
      timeout: 60000
    }, conf)

    this.link = link 
  
    this.init()  
  }

  init() {
    this._transports = new Map()
    this._reqs = new Map()

    setInterval(() => {
      this.monitor()
    }, this.conf.timeout)
  }

  transport(data) {
    return new Transport(this, data)
  }

  handleRequest(handler, data) {
    if (!data) {
      this.emit('request-error')
      return
    }

    const rid = data[0]
    const key = data[1]
    const payload = data[2]

    this.emit(
      'request', rid, key, payload,
      {
        reply: res => {
          handler.reply(rid, res)
        }
      }
    )
  }
  
  handleReply(rid, data) {
    const req = this._reqs.get(rid)
    if (!req) {
      return
    }

    this._reqs.delete(rid)

    const now = new Date()
    let err = null

    if (_.isString(data) && _.startsWith(data, 'ERR_')) {
      err = data
      data = null
    }

    //console.log('[' + req.key + '] ' + (now - req._ts) + 'ms')

    if (_.isFunction(req.cb)) {
      req.cb(err, data)
    }
  }

  req(key, payload, _opts, cb) {
    const rid = uuid.v4()
    const opts = _.extend({
      timeout: this.conf.timeout
    }, _opts)

    const req = {
      rid: rid,
      key: key,
      payload: payload,
      opts: opts,
      cb: cb,
      _ts: (new Date()).getTime()
    }
    
    this._reqs.set(rid, req)

    return req
  }

  enhance(socket) {}

  listen(type, dest) {
    if (this._transports.has(dest)) {
      return this._transports.get(dest)
    }

    const transport = this.transport({
      dir: 'server',
      type: type
    })

    this._transports.set(dest, transport)

    transport.set({
      listening: true
    })
    
    return this._listen(transport, type, dest)
  }

  unlisten(type, dest) {
    if (!this._transports.has(dest)) return
    const transport = this._transports.get(dest)

    transport.set({
      listening: false
    })
 
    this._unlisten(transport)
    this._transports.delete(dest)
  }
  
  _unlisten(transport) {
    if (!transport.listening) return
    transport.close()
  }

  connect(type, dest, cb) {
    if (this._transports.has(dest)) {
      let transport = this._transports.get(dest)
      if (transport.connected()) return cb()
    
      if (transport.connecting()) {
        transport._queue.push(cb)
        return
      }
    }
    
    const transport = this.transport({
      dir: 'client',
      type: type,
      _queue: [cb]
    })
  
    transport.flag({
      connected: false,
      connecting: true
    })
    
    transport.on('connect', () => {
      const cqueue = transport._queue
      
      transport.flag({
        connected: true,
        connecting: false
      })

      transport.set({
        _queue: []
      })

      _.each(cqueue, cb => {
        cb()
      })
    })

    transport.on('disconnect', () => {
      transport.flag({
        connected: false
      })

      if (transport.persist) {
        this._transports.delete(dest)
      }
    })

    if (transport.persist) {
      this._transports.set(dest, transport)
    }

    this._connect(transport, type, dest)
  }

  _disconnect(transport) {}

  announce(key, port, opts, cb) {
    this.link.announce(key, port, opts, cb)
  }

  put(opts, cb) {
    this.link.put(opts, cb)
  }

  get(opts, cb) {
    this.link.get(hash, cb)
  }

  _dest(dests) {
    return dests[_.random(0, dests.length - 1)]
  }

  request(key, payload, _opts, cb) {
    this.link.lookup(
      key, { timeout: 1000 },
      (err, dests) => {
        if (err) {
          cb(err)
          return
        }

        const dest = this._dest(dests)

        this.connect('req', dest, err => {
          if (err) {
            cb(err)
            return
          }

          this._request(dest, key, payload, cb)
        })
      }
    )  
  }

  _request(dest, key, payload, cb) {
    const transport = this._transports.get(dest)
    const req = this.req(key, payload, {}, cb)
    this._send(transport, [req.rid, key, payload])
  }

  monitor() {
    const now = (new Date()).getTime()
    this._reqs.forEach(req => {
      if (now > req._ts + req.opts.timeout) {
        this.handleReply(req.rid, 'ERR_TIMEOUT')
      }
    })
  }

  stop() {
    _.each(this._transports, transport => {
      transport.close()
    })

    this._transports.clear()
  }
}

module.exports = Peer
