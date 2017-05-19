'use strict'

const PeerRPC = require('./PeerRPC')
const TransportRPCServer = require('./TransportRPCServer')

class PeerRPCServer extends PeerRPC {
  getTransportClass () {
    return TransportRPCServer
  }
}

module.exports = PeerRPCServer
