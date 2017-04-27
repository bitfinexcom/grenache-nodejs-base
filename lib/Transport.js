'use strict'

const Events = require('events')
const _ = require('lodash')
const uuid = require('uuid')

class Transport extends Events {
  
  constructor(client, conf) {
    super()
   
    this.client = client
    this.conf = conf
    this.id = uuid.v4()
  }

  init() {
    this.active()
  }

  active() {
    this._active = true
  }

  stop() {
    this._active = false
    this._stop()
  }

  _stop() {}
}

module.exports = Transport
