'use strict'

const async = require('async')
const _ = require('lodash')
const Peer = require('./Peer')
const TransportRPCClient = require('./TransportRPCClient')
const PoolTransport = require('./PoolTransport')

class PeerRPCClient extends Peer {
  constructor (link, conf) {
    super(link, conf)

    _.defaults(this.conf, {
      maxActiveKeyDests: 5,
      maxActiveDestTransports: 3
    })
  }

  init () {
    super.init()

    this.tpool = new PoolTransport()
    this.tpool.init()
  }

  dest (dests, key) {
    let active = []

    _.each(dests, d => {
      if (this.tpool.hasActive(d)) {
        active.push(d)
      }
    })

    return super.dest(
      active.length >= this.conf.maxActiveKeyDests ? active : dests,
      key
    )
  }

  transport (dest) {
    let active = this.tpool.getActive(dest)
    if (active.length >= this.conf.maxActiveDestTransports) {
      return _.sample(active)
    }

    const t = super.transport(dest)
    this.tpool.add(dest, t)
    return t
  }

  getTransportClass () {
    return TransportRPCClient
  }

  request (key, payload, opts = {}, cb) {
    this.link.lookup(
      key, { timeout: 5000 },
      (err, dests) => {
        if (err) {
          cb(err)
          return
        }

        const dest = this.dest(dests, key)
        this.transport(dest).request(key, payload, opts, cb)
      }
    )
  }

  map (key, payload, opts = {}, cb) {
    this.link.lookup(
      key, { timeout: 5000 },
      (err, dests) => {
        if (err) {
          cb(err)
          return
        }

        if (!dests.length) {
          return cb(null, [])
        }

        const limit = opts.limit || 0
        if (limit) {
          dests = _.slice(_.shuffle(dests), 0, limit)
        }

        async.map(dests, (dest, next) => {
          this.transport(dest).request(key, payload, opts, next)
        }, cb)
      }
    )
  }

  _stop () {
    super._stop()
    this.tpool.stop()

    _.each(this.cache, c => {
      c.clear()
    })
  }
}

module.exports = PeerRPCClient