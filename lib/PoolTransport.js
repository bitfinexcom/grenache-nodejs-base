const _ = require('lodash')
const Pool = require('./Pool')

class TransportPool extends Pool {

  getActive(key) {
    return _.find(this.list(key), (t) => {
      return t.isActive()
    })
  }

  monitor() {
    super.monitor()

    this._pool.forEach((pool, key) => {
      pool.forEach(t => {
        if (!t.active()) {
          pool.delete(t.id)
        }
      })
      if (!pool.size) {
        this._pool.delete(key)
      }
    })
  }

  _stop() {
    this._pool.forEeach((pool, key) => {
      pool.forEach(t => t.stop())
      pool.clear()
    })
  }
}

module.exports = TransportPool
