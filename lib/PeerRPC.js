'use strict'

const uuid = require('uuid')
const _ = require('lodash')
const Peer = require('./Peer')
const TransportRPC = require('./TransportRPC')

class PeerRPC extends Peer {
  
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
