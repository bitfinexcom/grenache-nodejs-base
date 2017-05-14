'use strict'

const Peer = require('./Peer')
const TransportRPCServer = require('./TransportRPCServer')

class PeerRPCServer extends Peer {

  getTransportClass() {
    return TransportRPCServer
  }
}

module.exports = PeerRPCServer
