'use strict'

const Events = require('events')
const { v4: uuidv4 } = require('uuid')

class Transport extends Events {
  constructor (client, conf = {}) {
    super()

    this.client = client
    this.conf = conf
    this.id = uuidv4()
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
