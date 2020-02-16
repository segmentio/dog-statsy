class Trace {
  constructor(client, name, tags, now) {
    if (!name) {
      throw new Error("traces cannot be created without a name")
    }

    if (!tags) {
      tags = []
    }

    if (!now) {
      now = Trace.now()
    }

    this.client = client
    this.name = name
    this.tags = tags
    this.start = now
    this.steps = []
  }

  step(step, tags, now) {
    if (!tags) {
      tags = []
    }

    if (!now) {
      now = Trace.now()
    }

    tags.push('step:' + step)
    this.steps.push({ tags: tags, time: now })
  }

  complete(now) {
    const counter = this.name + '.count'
    const timer = this.name + '.seconds'

    if (!this.client) {
      throw new Error(this.name + ": Trace.complete called more than once")
    }

    if (!now) {
      now = Trace.now()
    }

    let ptime = this.start
    this.steps.forEach(step => {
      this.client.histogram(timer, seconds(ptime, step.time), this.tags.concat(step.tags))
      ptime = step.time
    })

    this.client.histogram(timer, seconds(this.start, now), this.tags.concat('step:request'))
    this.client.incr(counter, 1, this.tags)
    this.client = null
  }

  now() {
    return new Date
  }
}

function seconds(from, to) {
  return (to.getTime() - from.getTime()) / 1000.0
}

module.exports = Trace
