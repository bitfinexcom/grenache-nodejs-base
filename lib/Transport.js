'use strict'

const Events = require('events')
const { randomUUID } = require('crypto')

class Transport extends Events {
  constructor (client, conf = {}) {
    super()

    this.client = client
    this.conf = conf
    this.id = randomUUID()
  }

  init () {
    this.active()
  }

  isActive () {
    return !!this._active
  }

  active () {
    this._active = true
  }

  monitor () {}

  stop () {
    this._active = false
    this._stop()
  }

  _stop () {}
}

module.exports = Transport
