'use strict'

const Pool = require('./Pool')

class TransportPool extends Pool {
  hasActive (k) {
    return this.list(k).some((t) => t.isActive())
  }

  getActive (k) {
    return this.list(k).filter((t) => t.isActive())
  }

  monitor () {
    super.monitor()

    this._pool.forEach((pool, k) => {
      pool.forEach(t => {
        t.monitor()

        if (!t.isActive()) {
          pool.delete(t.id)
        }
      })

      if (!pool.size) {
        this._pool.delete(k)
      }
    })
  }

  _stop () {
    super._stop()

    this._pool.forEach((pool, k) => {
      pool.forEach(t => t.stop())
      pool.clear()
    })
  }
}

module.exports = TransportPool
