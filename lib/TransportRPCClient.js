'use strict'

const { v4: uuidv4 } = require('uuid')
const TransportRPC = require('./TransportRPC')

class TransportRPCClient extends TransportRPC {
  constructor (client, conf) {
    super(client, conf)

    this.conf = {
      inactivityTimeout: 120000,
      requestTimeout: 60000,
      ...this.conf
    }
  }

  init () {
    super.init()

    this.setLastRequestTime()
    this._reqs = new Map()
  }

  newRequest (key, payload, _opts, cb) {
    const rid = uuidv4()
    const opts = {
      timeout: this.conf.requestTimeout,
      ..._opts
    }

    const req = {
      rid,
      key,
      payload,
      opts,
      cb,
      _ts: Date.now()
    }

    return req
  }

  addRequest (req) {
    this._reqs.set(req.rid, req)
  }

  delRequest (req) {
    this._reqs.delete(req.rid)
  }

  getRequest (rid) {
    return this._reqs.get(rid)
  }

  sendRequest (req) {}
  async sendRequestStream (req) {}

  setLastRequestTime () {
    this._req_last_ts = Date.now()
  }

  request (key, payload, opts, cb) {}

  _request (key, payload, opts, cb) {
    const req = this.newRequest(key, payload, opts, cb)
    this.addRequest(req)
    this.sendRequest(req)
  }

  async _requestStream (key, opts) {
    const req = this.newRequest(key, null, opts)
    return this.sendRequestStream(req)
  }

  handleReply (rid, err, data) {
    const req = this.getRequest(rid)
    if (!req) return

    this.delRequest(req)

    if (typeof req.cb === 'function') {
      req.cb(err, data)
    }
  }

  monitor () {
    super.monitor()

    const now = Date.now()

    this._reqs.forEach(req => {
      if (now > req._ts + req.opts.timeout) {
        this.handleReply(req.rid, new Error('ERR_TIMEOUT'))
      }
    })

    const lrDiff = Date.now() - this._req_last_ts
    if (!this._reqs.size && lrDiff > this.conf.inactivityTimeout) {
      this.stop()
    }
  }

  _stop () {
    super._stop()

    this._reqs.forEach(req => {
      this.handleReply(req.rid, new Error('ERR_TIMEOUT'))
    })

    this._reqs.clear()
  }
}

module.exports = TransportRPCClient
