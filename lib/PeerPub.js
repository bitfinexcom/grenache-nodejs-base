'use strict'

const Peer = require('./Peer')
const TransportPub = require('./TransportPub')

class PeerPub extends Peer {
  getTransportClass () {
    return TransportPub
  }
}

module.exports = PeerPub
