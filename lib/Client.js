'use strict'

var Events = require('events')
var uuid = require('uuid')
var _ = require('lodash')
var _s = require('underscore.string')
var Transport = require('./Transport')

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

    var rid = data[0]
    var type = data[1]
    var payload = data[2]

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
    var req = this._reqs.get(rid)
    if (!req) {
      return
    }

    this._reqs.delete(rid)

    var now = new Date()
    var err = null

    if (_.isString(data) && _s.startsWith(data, 'ERR_')) {
      err = data
      data = null
    }

    //console.log('[' + req.type + '] ' + (now - req._ts) + 'ms')

    req.cb(err, data)
  }

  req(type, payload, _opts, cb) {
    var rid = uuid.v4()
    var opts = _.extend({
      timeout: this.conf.timeout
    }, _opts)

    var req = {
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

    var transport = this._transports[dest] = this.transport({
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

    var transport = this._transports[dest] = this.transport({
      dir: 'client',
      type: type,
      connected: false,
      _queue: [cb]
    })

    transport.on('connect', () => {
      var cqueue = transport._queue
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
    var transport = this._transports[dest]
    var req = this.req(type, payload, {}, cb)
    this._send(transport, [req.rid, type, payload])
  }

  publish(chan, payload) {}

  monitor() {
    var now = (new Date()).getTime()
    this._reqs.forEach(req => {
      if (now > req._ts + req.opts.timeout) {
        this.handleReply(req.rid, 'ERR_TIMEOUT')
      }
    })
  }
}

module.exports = Client
