'use strict'

const Events = require('events')
const _ = require('lodash')

class Transport extends Events {
  
  constructor(client, conf) {
    super()
    this.client = client
    this.set(conf)
  }

  set(conf) {
    _.extend(this, conf)
  }
}

module.exports = Transport
