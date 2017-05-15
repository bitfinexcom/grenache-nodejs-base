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
}

module.exports = TransportRPC
