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

  init() {}

  isConnecting() {
    return !!this._connecting
  }

  isConnected() {
    return !this.isConnecting() && this._connected
  }

  isActive() {
    return !!this._active
  }

  connecting() {
    this._connecting = true
    this._connected = false
  }

  connected() {
    this._connecting = false
    this._connected = true
  }

  disconnected() {
    this._connecting = false
    this._connected = false
  }

  active() {
    this._active = true
  }

  inactive() {
    this._active = false
  }

  close() {}
}

module.exports = Transport
