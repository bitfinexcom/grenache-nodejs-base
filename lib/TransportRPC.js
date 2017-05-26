'use strict'

const TransportSocket = require('./TransportSocket')

class TransportRPC extends TransportSocket {
  parse (data) {
    try {
      data = JSON.parse(data)
    } catch (e) {
      data = null
    }
    return data
  }

  format (data) {
    return JSON.stringify(data)
  }

  getSocket (port, conf) {
    // https://github.com/uWebSockets/bindings/issues/23
    throw new Error(
      'implementation error: getSocket method needs to get extended'
    )
  }
}

module.exports = TransportRPC
