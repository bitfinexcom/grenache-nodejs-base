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
    this._active = true
  }

  isActive() {
    return !!this._active
  }

  transport(dest) {
    return this.newTransport({ dest: dest })
  }

  newTransport(data) {
    const t = new (this.getTransportClass())(this, data)
    t.init()
    return t
  }

  dest(dests, key) {
    return _.sample(dests)
  }

  stop() {
    this._active = false
    this._stop()
  }
  
  _stop() {}
}

module.exports = Peer
