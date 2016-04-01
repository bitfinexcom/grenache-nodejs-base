'use strict'

var Events = require('events')
var uuid = require('uuid')
var _ = require('lodash')
var _s = require('underscore.string')

class Client extends Events {
  
  constructor(grape, conf) {
    super()

    this.conf = conf
    this.grape = grape
  
    this.init()  
  }

  init() {
    this._targets = {}
    this._reqs = new Map()
  }

  handleReply(rid, data) {
    var req = this._reqs.get(rid)
    if (!req) {
      return
    }

    this._reqs.delete(rid)

    var now = new Date()
    var err = null

    if (!err) {
      if (_.isString(data) && _s.startsWith(data, 'ERR_')) {
        err = data
        data = null
      }
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

  listen(type, target) {}

  connect(type, dest, cb) {
    if (this._targets[dest]) {
      let target = this._targets[dest]
      if (!target.connected) {
        target._queue.push(cb)
        return
      }
      cb()
      return
    }

    this._connect(type, dest, cb)
  }

  request(type, payload, _opts, cb) {
    this.grape.lookup('test', { timeout: 1000 }, (err, target) => {
      if (err) {
        cb(err)
        return
      }

      target = target[0]
      this.connect('req', target, err => {
        if (err) {
          cb(err)
          return
        }

        this._request(target, type, payload, cb)
      })
    })  
  }

  publish(chan, payload) {}

  stop() {}
}

module.exports = Client
