'use strict'

const async = require('async')
const _ = require('lodash')
const PeerRPC = require('./PeerRPC')
const TransportRPCClient = require('./TransportRPCClient')
const PoolTransport = require('./PoolTransport')

class PeerRPCClient extends PeerRPC {
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

  dest (dests, key, opts = {}) {
    let active = []

    _.each(dests, d => {
      if (this.tpool.hasActive(d)) {
        active.push(d)
      }
    })

    const maxActiveKeyDests = opts.maxActiveKeyDests || this.conf.maxActiveKeyDests

    return super.dest(
      active.length >= maxActiveKeyDests ? active : dests,
      key
    )
  }

  transport (dest, opts = {}) {
    let active = this.tpool.getActive(dest)

    const maxActiveDestTransports = opts.maxActiveDestTransports || this.conf.maxActiveDestTransports

    if (active.length >= maxActiveDestTransports) {
      return _.sample(active)
    }

    const t = super.transport(dest, opts)
    this.tpool.add(dest, t)
    return t
  }

  getTransportClass () {
    return TransportRPCClient
  }

  getTransportOpts (opts) {
    return _.defaults({
      maxActiveDestTransports: opts.maxActiveDestTransports
    }, super.getTransportOpts(opts))
  }

  getRequestOpts (opts) {
    return {
      timeout: opts.timeout
    }
  }

  getDestOpts (opts) {
    return {
      maxActiveKeyDests: opts.maxActiveKeyDests
    }
  }

  request (key, payload, opts = {}, cb) {
    if (typeof opts === 'function') return this.request(key, payload, undefined, opts)

    this.link.lookup(
      key, {},
      (err, dests) => {
        if (err) {
          cb(err)
          return
        }

        async.retry(
          opts.retry || 1,
          done => {
            const dest = this.dest(dests, key, this.getDestOpts(opts))

            this.transport(dest, this.getTransportOpts(opts))
              .request(key, payload, this.getRequestOpts(opts), done)
          },
          cb
        )
      }
    )
  }

  map (key, payload, opts = {}, cb) {
    this.link.lookup(
      key, {},
      (err, dests) => {
        if (err) {
          cb(err)
          return
        }

        const continueOnErrors = opts.continueOnErrors || false

        if (!dests.length) {
          return cb(null, [])
        }

        const limit = opts.limit || 0
        if (limit) {
          dests = _.slice(_.shuffle(dests), 0, limit)
        }

        const excludeDests = opts.excludeDests || false
        let newDests = dests
        if (excludeDests) {
          newDests = dests.filter(dest => !excludeDests.includes(dest))
        }

        async.map(newDests, (dest, next) => {
          this.transport(dest, this.getTransportOpts(opts))
            .request(key, payload, this.getRequestOpts(opts), (err, data) => {
              if (continueOnErrors) {
                if (err) {
                  next(null, err)
                } else {
                  next(err, data)
                }
              } else {
                next(err, data)
              }
            })
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
