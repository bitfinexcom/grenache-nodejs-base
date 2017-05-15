const _ = require('lodash')

class Pool {
  init () {
    this._pool = new Map()

    this._monitorItv = setInterval(() => {
      this.monitor()
    }, 10000)
  }

  add (k, obj) {
    if (!this._pool.has(k)) {
      this._pool.set(k, new Map())
    }

    const pool = this._pool.get(k)
    pool.set(obj.id, obj)
  }

  del (k, obj) {
    if (!this._pool.has(k)) {
      return
    }

    const pool = this._pool.get(k)
    pool.delete(obj.id)

    if (!pool.size) {
      this._pool.delete(k)
    }
  }

  list (k) {
    const pool = this._pool.get(k)
    if (!pool) return []

    return _.filter(Array.from(pool.values()))
  }

  monitor () {}

  stop () {
    clearInterval(this._monitorItv)
    this._stop()
    this._pool.clear()
  }

  _stop () {}
}

module.exports = Pool
