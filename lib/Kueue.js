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

  trigger(k, err, res) {
    const q = this.q.get(k)

    if (!q) return

    this.q.delete(k)
    _.each(q, cb => cb(err, res))
  }

  cnt(k) {
    const q = this.q.get(k)
    if (!q) return 0
    return q.length
  }
}

module.exports = Kueue
