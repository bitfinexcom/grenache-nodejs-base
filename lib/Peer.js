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

  getTransportOpts (opts) {
    return {}
  }

  transport (dest, opts = {}) {
    const conf = _.defaults({
      dest: dest
    }, this.conf)

    return this.newTransport(conf)
  }

  newTransport (conf) {
    const t = new (this.getTransportClass())(this, conf)
    t.init()
    return t
  }

  dest (dests, key, opts = {}) {
    return _.sample(dests)
  }

  stop () {
    this._active = false
    this._stop()
  }

  _stop () {}
}

module.exports = Peer
