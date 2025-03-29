'use strict'

const TransportSocket = require('./TransportSocket')

class TransportSub extends TransportSocket {
  init () {
    super.init()

    for (const k of ['connected', 'disconnected', 'message']) {
      this.on(k, data => {
        this.client.emit(k, data)
      })
    }
  }
}

module.exports = TransportSub
