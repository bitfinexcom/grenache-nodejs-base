'use strict'

const Events = require('events')
const _ = require('lodash')

class Peer extends Events {
  constructor (link, conf = {}) {
    super()

    this.conf = conf
    this.link = link
  }

  init () {
    this._active = true
  }

  isActive () {
    return !!this._active
  }

  transport (dest) {
    const opts = {}
    _.extend(opts, this.conf, { dest: dest })
    return this.newTransport(opts)
  }

  newTransport (data) {
    const t = new (this.getTransportClass())(this, data)
    t.init()
    return t
  }

  dest (dests, key) {
    return _.sample(dests)
  }

  stop () {
    this._active = false
    this._stop()
  }

  _stop () {}
}

module.exports = Peer
