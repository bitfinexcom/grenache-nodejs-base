'use strict'

const _ = require('lodash')
const uuid = require('uuid')
const Transport = require('./Transport')

class TransportRPC extends Transport {

  constructor(client, conf) {
    super(client, conf)

    _.defaults(this.conf, {
      timeoutInactivity: 120000
    })
  }

  init() {
    super.init()

    this.setLastRequestTime()
    this._reqs = new Map()
  }

  isConnecting() {
    return !!this._connecting
  }

  isConnected() {
    return !this.isConnecting() && this._connected
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

  sendRequest(req) {}

  setLastRequestTime() {
    this._req_last_ts = Date.now()
  }
  
  request(key, payload, opts, cb) {}

  _request(key, payload, opts, cb) {
    const req = this.newRequest(key, payload, opts, cb)
    this.addRequest(req)
    this.sendRequest(req)
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
    const req = this.getRequest(rid)
    if (!req) return

    this.delRequest(req)

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
    super.monitor()

    const now = Date.now()

    this._reqs.forEach(req => {
      if (now > req._ts + req.opts.timeout) {
        this.handleReply(req.rid, 'ERR_TIMEOUT')
      }
    })

    if (!this.isListening()) {
      const diff_lr = Date.now() - this._req_last_ts
      if (!this._reqs.size && diff_lr > this.conf.timeoutInactivity) {
        this.stop()
      }
    }
  }

  _stop() {
    super._stop()
    
    this._reqs.forEach(req => {
      this.handleReply(req.rid, 'ERR_TIMEOUT')
    })
    
    this._reqs.clear()
  }
}

module.exports = TransportRPC
