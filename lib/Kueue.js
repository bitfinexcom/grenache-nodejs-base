const _ = require('lodash')

class Kueue {

  constructor() {
    this.q = new Map()
  }

  push(k, cb) {
    if (!this.q.has(k)) {
      this.q.set(k, [])
    }

    const q = this.q.get(k)
    q.push(cb)
  }

  trigger(k, err) {
    const q = this.q.get(k)

    if (!q) return

    _.each(q, cb => cb(err))
    this.q.delete(k)
  }
}

module.exports = Kueue
