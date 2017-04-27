const _ = require('lodash')
const Pool = require('./Pool')

class TransportPool extends Pool {

  getActive(k) {
    return _.find(this.list(k), (t) => {
      return t.isActive()
    })
  }

  monitor() {
    super.monitor()

    this._pool.forEach((pool, k) => {
      pool.forEach(t => {
        if (!t.active()) {
          pool.delete(t.id)
        }
      })
      if (!pool.size) {
        this._pool.delete(k)
      }
    })
  }

  _stop() {
    super._stop()

    this._pool.forEeach((pool, k) => {
      pool.forEach(t => t.stop())
      pool.clear()
    })
  }
}

module.exports = TransportPool
