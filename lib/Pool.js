const _ = require('lodash')

class Pool {
  
  constructor() {}

  init() {
    this._pool = new Map()
    
    this._monitorItv = setInterval(() => {
      this.monitor()
    }, 10000)
  }

  add(key, obj) {
    if (!this._pool.has(key)) {
      this._pool.set(key, new Map())
    }

    const pool = this._pool.get(key)
    pool.set(obj.id, obj)
  }

  del(key, obj) {
    if (!this._pool.has(key)) {
      return 
    }

    const pool = this._pool.get(key)
    pool.delete(obj.id)

    if (!pool.size) {
      this._pool.delete(key)
    }
  }

  list(key) {
    const pool = this._pool.get(key)
    if (!pool) return []

    return _.filter(Array.from(pool.values()))
  }

  monitor() {}

  stop() {
    clearInterval(this._monitorItv)
    if (ths._stop) this._stop()
    this._pool.clear()
  }
}

module.exports = Pool
