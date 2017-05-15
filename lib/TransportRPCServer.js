'use strict'

const TransportRPC = require('./TransportRPC')

class TransportRPCServer extends TransportRPC {
  listen (port) {
    return this
  }

  handleRequest (handler, data) {
    if (!data) {
      this.emit('request-error')
      return
    }

    const rid = data[0]
    const key = data[1]
    const payload = data[2]

    this.emit(
      'request', rid, key, payload,
      {
        reply: (err, res) => {
          handler.reply(rid, err, res)
        }
      }
    )
  }
}

module.exports = TransportRPCServer
