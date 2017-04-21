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

  init() {}

  transport(dest) {
    return this.newTransport({ dest: dest })
  }

  newTransport(data) {
    const t = new (this.getTransportClass())(this, data)
    t.init()
    return t
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
