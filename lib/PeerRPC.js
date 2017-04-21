'use strict'

const uuid = require('uuid')
const _ = require('lodash')
const Peer = require('./Peer')
const TransportRPC = require('./TransportRPC')

class PeerRPC extends Peer {
  
  constructor(link, conf) {
    super(link, conf)

    if (!this.conf.timeout) {
      this.conf.timeout = 60000
    }

    this.init()  
  }

  getTransportClass() {
    return TransportRPC
  }

  request(key, payload, opts, cb) {
    this.link.lookup(
      key, { timeout: 1000 },
      (err, dests) => {
        if (err) {
          cb(err)
          return
        }

        const dest = this.dest(dests)
        this.transport(dest).request(key, payload, opts, cb)
      }
    )  
  }
}

module.exports = PeerRPC
