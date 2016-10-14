'use strict'

const Events = require('events')
const uuid = require('uuid')
const _ = require('lodash')
const Transport = require('./Transport')

class Client extends Events {
  
  constructor(link, conf) {
    super()

    this.conf = _.extend({
      timeout: 60000
    }, conf)

    this.link = link 
  
    this.init()  
  }

  init() {
    this._transports = {}
    this._reqs = new Map()

    setInterval(() => {
      this.monitor()
    }, this.conf.timeout)
  }

  transport(data) {
    return new Transport(this, data)
  }

  parseRequest(data) {
    return data
  }

  handleRequest(handler, data) {
    data = this.parseRequest(data)

    if (!data) {
      this.emit('request-error')
      return
    }

    const rid = data[0]
    const type = data[1]
    const payload = data[2]

    this.emit(
      'request', rid, type, payload,
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

    //console.log('[' + req.type + '] ' + (now - req._ts) + 'ms')

    req.cb(err, data)
  }

  req(type, payload, _opts, cb) {
    const rid = uuid.v4()
    const opts = _.extend({
      timeout: this.conf.timeout
    }, _opts)

    const req = {
      rid: rid,
      type: type,
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
    if (this._transports[dest]) {
      return this._transports[dest]
    }

    const transport = this._transports[dest] = this.transport({
      dir: 'server',
      type: type
    })
    
    return this._listen(transport, type, dest)
  }

  connect(type, dest, cb) {
    if (this._transports[dest]) {
      let transport = this._transports[dest]
      if (!transport.connected) {
        transport._queue.push(cb)
        return
      }
      cb()
      return
    }
    
    const transport = this.transport({
      dir: 'client',
      type: type,
      connected: false,
      _queue: [cb]
    })
    
    transport.on('connect', () => {
      const cqueue = transport._queue
      
      transport.set({
        connected: true,
        _queue: []
      })
      
      _.each(cqueue, cb => {
        cb()     
      })
    })
    
    transport.on('disconnect', () => {
      transport.set({
        connected: false
      })
    })

    if (transport.persist) {
      this._transports[dest] = transport
    }

    this._connect(transport, type, dest, cb)
  }

  announce(key, port, opts, cb) {
    this.link.announce(key, port, opts, cb)
  }

  put(opts, cb) {
    this.link.put(opts, cb)
  }

  get(opts, cb) {
    this.link.get(hash, cb)
  }

  request(type, payload, _opts, cb) {
    this.link.lookup('test', { timeout: 1000 }, (err, dest) => {
      if (err) {
        cb(err)
        return
      }

      dest = dest[0]

      this.connect('req', dest, err => {
        if (err) {
          cb(err)
          return
        }

        this._request(dest, type, payload, cb)
      })
    })  
  }

  _request(dest, type, payload, cb) {
    const transport = this._transports[dest]
    const req = this.req(type, payload, {}, cb)
    this._send(transport, [req.rid, type, payload])
  }

  publish(chan, payload) {}

  monitor() {
    const now = (new Date()).getTime()
    this._reqs.forEach(req => {
      if (now > req._ts + req.opts.timeout) {
        this.handleReply(req.rid, 'ERR_TIMEOUT')
      }
    })
  }
}

module.exports = Client
