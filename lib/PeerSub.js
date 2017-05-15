'use strict'

const Peer = require('./Peer')
const TransportSub = require('./TransportSub')

class PeerSub extends Peer {
  getTransportClass () {
    return TransportSub
  }

  sub (key, opts) {
    this.link.lookup(
      key, { timeout: 5000 },
      (err, dests) => {
        if (err) {
          this.emit('error', err)
          return
        }

        const dest = this.dest(dests, key)
        this.transport(dest).sub(key, opts)
      }
    )
  }
}

module.exports = PeerSub
