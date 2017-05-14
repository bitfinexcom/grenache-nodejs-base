'use strict'

const TransportSocket = require('./TransportSocket')

class TransportSub extends TransportSocket {

  init() {
    super.init()

    this.on('message', data => {
      this.client.emit('mesage', data)
    })
  }

}

module.exports = TransportSub
