'use strict'

const _ = require('lodash')
const TransportSocket = require('./TransportSocket')

class TransportSub extends TransportSocket {
  init () {
    super.init()

    _.each(['connected', 'disconnected', 'message'], k => {
      this.on(k, data => {
        this.client.emit(k, data)
      })
    })
  }
}

module.exports = TransportSub
