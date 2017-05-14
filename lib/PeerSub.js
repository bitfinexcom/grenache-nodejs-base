'use strict'

const Peer = require('./Peer')
const TransportSub = require('./TransportSub')

class PeerSub extends Peer {

  getTransportClass() {
    return TransportSub
  }

  sub(key, opts, cb) {
    this.link.lookup(
      key, { timeout: 5000 },
      (err, dests) => {
        if (err) {
          cb(err)
          return
        }

        const dest = this.dest(dests, key)
        this.transport(dest).sub(key, opts, cb)
      }
    )  
  }
}

module.exports = PeerSub
