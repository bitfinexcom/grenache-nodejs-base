const _ = require('lodash')
const Pool = require('./Pool')

class TransportPool extends Pool {
  hasActive (k) {
    return _.find(this.list(k), (t) => {
      return t.isActive()
    })
  }

  getActive (k) {
    return _.filter(this.list(k), (t) => {
      return t.isActive()
    })
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
