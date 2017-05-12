'use strict'

const uuid = require('uuid')
const _ = require('lodash')
const LRU = require('lru')
const Peer = require('./Peer')
const TransportRPC = require('./TransportRPC')
const PoolTransport = require('./PoolTransport')

class PeerRPC extends Peer {

  constructor(link, conf = {}) {
    super(link, conf)

    _.defaults(this.conf, {
      maxActiveKeyDests: 5,
      maxActiveDestTransports: 3
    })
  }

  init() {
    super.init()

    this.tpool = new PoolTransport()
    this.tpool.init()

    this.cache = {
      dest: new LRU({
        max: 1000,
        maxAge: 5000
      })
    }
  }

  dest(dests, key) {
    const chash = `${key}:dests`
    const dest_cached = this.cache.dest.get(chash)
    
    if (dest_cached) {
      return dest_cached
    }

    let active = []

    _.each(dests, d => {
      if (this.tpool.getActive(d)) {
        active.push(active)
      }
    })

    const dest = super.dest(
      active.length > this.conf.maxActiveKeyDests ? active : dests,
      key
    )
    this.cache.dest.set(chash, dest)

    return dest
  }

  transport(dest) {
    let t = this.tpool.getActive(dest)
    if (t) {
      return t
    }

    t = super.transport(dest)
    this.tpool.add(dest, t)
    return t
  }

  getTransportClass() {
    return TransportRPC
  }

  _request(dest, key, payload, opts, cb) {
    this.transport(dest).request(key, payload, opts, cb)
  }

  request(key, payload, opts, cb) {
    this.link.lookup(
      key, { timeout: 5000 },
      (err, dests, lid) => {
        if (err) {
          cb(err)
          return
        }

        const dest = this.dest(dests, lid)
        this._request(dest, key, payload, opts, cb)
      }
    )  
  }

  _stop() {
    super._stop()
    this.tpool.stop()

    _.each(this.cache, c => {
      c.clear()
    })
  }  
}

module.exports = PeerRPC
