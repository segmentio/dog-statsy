const EventEmitter = require('events')
const dgram = require('dgram')
const net = require('net')
const Trace = require('./trace')

class Client extends EventEmitter {
  constructor({ host, port, prefix, tags, flushInterval, bufferSize }) {
    super()
    this.host = host || 'localhost'
    this.port = port || 8125
    this.prefix = prefix
    this.tags = tags || []
    this.flushInterval = null
    this.buffer = ''
    this.bufferSize = bufferSize || 1024
    this.sock = dgram.createSocket('udp4')

    const events = ['close', 'connect', 'error', 'message']
    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      this.sock.on(event, (...args) => this.emit(event, ...args))
    }

    this.setFlushInterval(flushInterval)
  }

  /**
   * Set the buffer flush interval as a number of milliseconds.
   *
   * @param {Number} msec The time interval for buffer flushes, or a falsy value
   * to disable buffer flushing.
   */
  setFlushInterval(msec) {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    if (msec) {
      this.flushInterval = setInterval(() => this.flush(), msec)
    } else {
      this.flushInterval = null
    }
  }

  /**
   * Closes the underlying socket, preventing the client from sending messages.
   */
  close() {
    this.sock.close()
  }

  /**
   * Send with prefix when specified.
   *
   * @param {String} msg
   * @param {Array} tags
   * @api private
   */
  write(msg, tags) {
    if (this.prefix) {
      msg = this.prefix + '.' + msg
    }

    if (tags || this.tags.length) {
      tags = tags || []
      tags = this.tags.concat(tags)
      msg += "|#" + tags.join(',')
    }

    if (this.bufferSize && this.bufferSize > 0) {
      if ((this.buffer.length + msg.length) > this.bufferSize) {
        this.flush()
      }
      this.buffer += msg
      this.buffer += '\n'
      return
    }

    this.sock.send(msg, this.port, this.host)
  }

  /**
   * Flush buffered data, this method is a no-op if buffering is disabled.
   */
  flush() {
    if (this.buffer.length > 0) {
      this.sock.send(this.buffer, this.port, this.host)
      this.buffer = ''
      this.emit('flush')
    }
  }

  /**
   * Send a gauge value.
   *
   * @param {String} name
   * @param {Number} val
   * @param {Array} tags
   * @api public
   */
  gauge(name, val, tags) {
    this.write(name + ':' + val + '|g', tags)
  }

  /**
   * Send a set value.
   *
   * @param {String} name
   * @param {Number} val
   * @param {Array} tags
   * @api public
   */
  set(name, val, tags) {
    this.write(name + ':' + val + '|s', tags)
  }

  /**
   * Send a meter value.
   *
   * @param {String} name
   * @param {Number} val
   * @param {Array} tags
   * @api public
   */
  meter(name, val, tags) {
    this.write(name + ':' + val + '|m', tags)
  }

  /**
   * Send a timer value or omit the value
   * to return a completion function.
   *
   * @param {String} name
   * @param {Number} [val]
   * @param {Array} tags
   * @return {Function}
   * @api public
   */
  timer(name, val, tags) {
    if (arguments.length === 1) {
      // Note: this behavior is kind of broken because we can't specify tags,
      // but we retain it in case some programs are depending on it.
      const start = new Date
      return () => this.timer(name, new Date - start)
    }
    this.write(name + ':' + val + '|ms', tags)
  }

  /**
   * Send a histogram value or omit the value
   * to return a completion function.
   *
   * @param {String} name
   * @param {Number} [val]
   * @param {Array} tags
   * @return {Function}
   * @api public
   */
  histogram(name, val, tags) {
    if (arguments.length === 1) {
      // Note: this behavior is kind of broken because we can't specify tags,
      // but we retain it in case some programs are depending on it.
      const start = new Date
      return () => self.histogram(name, new Date - start)
    }
    this.write(name + ':' + val + '|h', tags)
  }

  /**
   * Send a counter value with optional sample rate.
   *
   * @param {String} name
   * @param {Number} val
   * @param {Number} sample
   * @param {Array} tags
   * @api public
   */
  count(name, val, sample, tags) {
    if (sample) {
      this.write(name + ':' + val + '|c|@' + sample, tags)
    } else {
      this.write(name + ':' + val + '|c', tags)
    }
  }

  /**
   * Increment counter by `val` or 1.
   *
   * @param {String} name
   * @param {Number} val
   * @param {Array} tags
   * @api public
   */
  incr(name, val, tags) {
    if (val == null) { // check for null-like values (e.g. undefined)
      val = 1
    }
    this.count(name, val, null, tags)
  }

  /**
   * Decrement counter by `val` or 1.
   *
   * @param {String} name
   * @param {Number} val
   * @param {Array} tags
   * @api public
   */
  decr(name, val, tags) {
    if (null == val) { // check for null-like values (e.g. undefined)
      val = 1
    }
    this.count(name, -val, null, tags)
  }

  /**
   * Creates a trace object that generates stats on this client.
   *
   * @param {String} name The name of the new trace, prefix for all its stats.
   * @param {Array} [tags] The default tags set to all stats of the trace.
   * @param {Date} [now] The start time of the trace
   */
  trace(name, tags, now) {
    return new Trace(this, name, tags, now)
  }
}

module.exports = Client
