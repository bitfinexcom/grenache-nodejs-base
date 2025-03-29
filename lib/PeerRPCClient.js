'use strict'

const async = require('async')
const duplexify = require('duplexify')
const pump = require('pump')
const { PassThrough } = require('stream')
const { sample, shuffle } = require('@bitfinexcom/lib-js-util-base')

const PeerRPC = require('./PeerRPC')
const TransportRPCClient = require('./TransportRPCClient')
const PoolTransport = require('./PoolTransport')

class PeerRPCClient extends PeerRPC {
  constructor (link, conf) {
    super(link, conf)

    this.conf = {
      maxActiveKeyDests: 5,
      maxActiveDestTransports: 3,
      ...this.conf
    }
  }

  init () {
    super.init()

    this.tpool = new PoolTransport()
    this.tpool.init()
  }

  dest (dests, key, opts = {}) {
    const active = []

    for (const d of dests || []) {
      if (this.tpool.hasActive(d)) {
        active.push(d)
      }
    }

    const maxActiveKeyDests = opts.maxActiveKeyDests || this.conf.maxActiveKeyDests

    return super.dest(
      active.length >= maxActiveKeyDests ? active : dests,
      key
    )
  }

  transport (dest, opts = {}) {
    const active = this.tpool.getActive(dest)

    const maxActiveDestTransports = opts.maxActiveDestTransports || this.conf.maxActiveDestTransports

    if (active.length >= maxActiveDestTransports) {
      return sample(active)
    }

    const t = super.transport(dest, opts)
    this.tpool.add(dest, t)
    return t
  }

  getTransportClass () {
    return TransportRPCClient
  }

  getTransportOpts (opts) {
    return {
      ...super.getTransportOpts(opts),
      maxActiveDestTransports: opts.maxActiveDestTransports
    }
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

  stream (key, opts) {
    const dup = duplexify()
    const incoming = new PassThrough()
    const outgoing = new PassThrough()

    dup.setReadable(outgoing)
    dup.setWritable(incoming)

    this.link.lookup(key, {}, async (err, dests) => {
      if (err) {
        dup.destroy(err)
        return
      }

      const dest = this.dest(dests, key, this.getDestOpts(opts))
      const t = this.transport(dest, this.getTransportOpts(opts))

      const req = await t.requestStream(key, this.getRequestOpts(opts))
      pump(incoming, req, outgoing)
    })

    return dup
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

        if (!dests.length) {
          return cb(null, [])
        }

        const limit = opts.limit || 0
        if (limit) {
          dests = shuffle(dests).slice(0, limit)
        }

        async.map(dests, (dest, next) => {
          this.transport(dest, this.getTransportOpts(opts))
            .request(key, payload, this.getRequestOpts(opts), next)
        }, cb)
      }
    )
  }

  _stop () {
    super._stop()
    this.tpool.stop()

    for (const c of this.cache || []) {
      c.clear()
    }
  }
}

module.exports = PeerRPCClient
