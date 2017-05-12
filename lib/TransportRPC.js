'use strict'

const _ = require('lodash')
const uuid = require('uuid')
const Transport = require('./Transport')

class TransportRPC extends Transport {

  constructor(client, conf) {
    super(client, conf)

    if (!this.conf.timeout_monitor) {
      this.conf.timeout_monitor = 10000
    }
  }

  init() {
    super.init()

    this._reqs = new Map()

    this._monitorItv = setInterval(() => {
      this.monitor()
    }, this.conf.timeout_monitor)
  }

  isConnecting() {
    return !!this._connecting
  }

  isConnected() {
    return !this.isConnecting() && this._connected
  }

  isActive() {
    return !!this._active
  }

  isListening() {
    return !!this._listening
  }

  connecting() {
    this._connecting = true
    this._connected = false
  }

  connected() {
    this._connecting = false
    this._connected = true
  }

  disconnected() {
    this._connecting = false
    this._connected = false
  }

  listening() {
    this._listening = true
  }

  unlistening() {
    this._listening = false
  }
  
  newRequest(key, payload, _opts, cb) {
    const rid = uuid.v4()
    const opts = _.extend({
      timeout: this.conf.timeout_request || 60000
    }, _opts)

    const req = {
      rid: rid,
      key: key,
      payload: payload,
      opts: opts,
      cb: cb,
      _ts: Date.now() 
    }

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

  handleReply(req, data) {
    let err = null

    if (_.isString(data) && _.startsWith(data, 'ERR_')) {
      err = data
      data = null
    }

    if (_.isFunction(req.cb)) {
      req.cb(err, data)
    }
  }

  parse(data) {
    try {
      data = JSON.parse(data)
    } catch(e) {
      data = null
    }
    return data
  }

  format(data) {
    return JSON.stringify(data)
  }

  monitor() {
    const now = Date.now()

    this._reqs.forEach(req => {
      if (now > req._ts + req.opts.timeout) {
        this.handleReply(req, 'ERR_TIMEOUT')
      }
    })
  }

  _stop() {
    super._stop()
    
    clearInterval(this._monitorItv)

    this._reqs.forEach(req => {
      this.handleReply(req, 'ERR_TIMEOUT')
    })
    
    this._reqs.clear()
  }
}

module.exports = TransportRPC
