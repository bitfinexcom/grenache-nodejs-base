'use strict'

const Events = require('events')
const _ = require('lodash')
const Transport = require('./Transport')

class Peer extends Events {
  
  constructor(link, conf = {}) {
    super()

    this.conf = conf
    this.link = link 
  }

  init() {
    this._transports = new Map()
  }

  transport(dest) {
    return this.newTransport({ dest: dest })
  }

  newTransport(data) {
    return new (this.getTransportClass())(this, data)
  }

  addTransport(dest, transport) {
    if (!this._transports.has(dest)) {
      this._transports.set(dest, new Map())
    }

    const transports = this._transports.get(dest)
    transports.set(transport.id, transport)
  }

  delTransport(dest, transport) {
    if (!this._transports.has(dest)) {
      return 
    }

    const transports = this._transports.get(dest)
    transports.delete(transport.id)

    if (!transports.size) {
      this._transports.delete(dest)
    }
  }

  getTransports(dest) {
    const transports = this._transports.get(dest)
    if (!transports) return []

    return _.filter(Array.from(transports.values()))
  }

  getTransport(dest) {
    return _.first(this.getTransports(dest))
  }

  stopTransports() {
    this._transports.forEach(transports => {
      transports.forEeach(t => {
        t.stop()
      })
      transports.clear()
    })
    this._transports.clear()
  }

  announce(key, port, opts, cb) {
    this.link.announce(key, port, opts, cb)
  }

  put(opts, cb) {
    this.link.put(opts, cb)
  }

  get(opts, cb) {
    this.link.get(hash, cb)
  }

  dest(dests, key) {
    return dests[_.random(0, dests.length - 1)]
  }
}

module.exports = Peer
