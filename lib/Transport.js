'use strict'

const Events = require('events')
const _ = require('lodash')

class Transport extends Events {
  
  constructor(client, conf) {
    super()
   
    this.client = client
    this.set(conf)
  }

  set(o) {
    _.extend(this, o)
  }

  flag(o) {
    _.each(o, (v, k) => {
      this[`_${k}`] = v
    })
  }
  
  connecting() {
    return !!this._connecting
  }

  connected() {
    console.log(this.connecting(), this._connected)
    return !this.connecting() && this._connected
  }

  close() {}
}

module.exports = Transport
