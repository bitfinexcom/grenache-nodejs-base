'use strict'

const Transport = require('./Transport')

class TransportSocket extends Transport {
  isConnecting () {
    return !!this._connecting
  }

  isConnected () {
    return !this.isConnecting() && this._connected
  }

  isListening () {
    return !!this._listening
  }

  connecting () {
    this._connecting = true
    this._connected = false
  }

  connected () {
    this._connecting = false
    this._connected = true
  }

  disconnected () {
    this._connecting = false
    this._connected = false
  }

  listening () {
    this._listening = true
  }

  unlistening () {
    this._listening = false
  }
}

module.exports = TransportSocket
