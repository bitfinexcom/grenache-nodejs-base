'use strict'

const _ = require('lodash')
const Peer = require('./Peer')
const TransportRPC = require('./TransportRPC')

class PeerRPC extends Peer {

  getTransportClass () {
    return TransportRPC
  }
 }

module.exports = PeerRPC
