'use strict'

var Events = require('events')
var _ = require('lodash')

class Transport extends Events {
  
  constructor(data) {
    super()
    this.set(data)
  }

  set(data) {
    _.extend(this, data)
  }
}

module.exports = Transport
