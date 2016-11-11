
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var debug = require('debug')('dog-statsy');
var Aggregator = require('./aggregate');
var fwd = require('forward-events');
var assert = require('assert');
var dgram = require('dgram');
var net = require('net');
var url = require('url');
var Trace = require('./trace');

/**
 * Expose `Client`.
 */

exports = module.exports = Client;

/**
 * Aggregate metrics using `client` and `options`.
 *
 * Options:
 *
 *    - `.interval`: flush interval to use, default is 0.5s
 *    - `.maxKeys`: maximum keys cap, when reached all keys are flushed.
 *
 * @param {Client} client
 * @param {Object} options
 * @return {Aggregator}
 */

exports.aggregate = function(client, opts){
  return new Aggregator(client, opts || {});
};

/**
 * Initialize a new `Client` with `opts`.
 *
 * @param {Object} [opts]
 * @api public
 */

function Client(opts) {
  if (!(this instanceof Client)) return new Client(opts);
  opts = opts || {};
  this.host = opts.host || 'localhost';
  this.port = opts.port || 8125;
  this.prefix = opts.prefix;
  this.tags = opts.tags || [];
  this.on('error', this.onerror.bind(this));
  this.connect();
}

/**
 * Inherit from `Emitter.prototype`.
 */

Client.prototype.__proto__ = Emitter.prototype;

/**
 * Noop errors.
 */

Client.prototype.onerror = function(err){
  debug('error %s', err.stack);
};

/**
 * Connect via UDP.
 *
 * @api private
 */

Client.prototype.connect = function(){
  this.sock = dgram.createSocket('udp4');
  fwd(this.sock, this);
};

/**
 * Send `msg`.
 *
 * @param {String} msg
 * @api private
 */

Client.prototype.send = function(msg){
  var sock = this.sock;
  var buf = new Buffer(msg);
  sock.send(buf, 0, buf.length, this.port, this.host);
};

/**
 * Send with prefix when specified.
 *
 * @param {String} msg
 * @param {Array} tags
 * @api private
 */

Client.prototype.write = function(msg, tags){
  if (this.prefix) msg = this.prefix + '.' + msg;

  if (tags || this.tags.length) {
    tags = tags || [];
    tags = this.tags.concat(tags);
    msg += "|#" + tags.join(',');
  }

  this.send(msg);
};

/**
 * Send a gauge value.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Array} tags
 * @api public
 */

Client.prototype.gauge = function(name, val, tags){
  debug('gauge %j %s', name, val);
  this.write(name + ':' + val + '|g', tags);
};

/**
 * Send a set value.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Array} tags
 * @api public
 */

Client.prototype.set = function(name, val, tags){
  debug('set %j %s', name, val);
  this.write(name + ':' + val + '|s', tags);
};

/**
 * Send a meter value.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Array} tags
 * @api public
 */

Client.prototype.meter = function(name, val, tags){
  debug('meter %j %s', name, val);
  this.write(name + ':' + val + '|m', tags);
};

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

Client.prototype.timer = function(name, val, tags){
  var self = this;

  if (1 == arguments.length) {
    var start = new Date;
    return function(){
      self.timer(name, new Date - start);
    }
  }

  debug('timer %j %s', name, val);
  this.write(name + ':' + val + '|ms', tags);
};

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

Client.prototype.histogram = function(name, val, tags){
  var self = this;

  if (1 == arguments.length) {
    var start = new Date;
    return function(){
      self.histogram(name, new Date - start);
    }
  }

  debug('histogram %j %s', name, val);
  this.write(name + ':' + val + '|h', tags);
};

/**
 * Send a counter value with optional sample rate.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Number} sample
 * @param {Array} tags
 * @api public
 */

Client.prototype.count = function(name, val, sample, tags){
  debug('count %j %s sample=%s', name, val, sample);
  if (sample) {
    this.write(name + ':' + val + '|c|@' + sample, tags);
  } else {
    this.write(name + ':' + val + '|c', tags);
  }
};

/**
 * Increment counter by `val` or 1.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Array} tags
 * @api public
 */

Client.prototype.incr = function(name, val, tags){
  if (null == val) val = 1;
  this.count(name, val, null, tags);
};

/**
 * Decrement counter by `val` or 1.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Array} tags
 * @api public
 */

Client.prototype.decr = function(name, val, tags){
  if (null == val) val = 1;
  this.count(name, -val, null, tags);
};

/**
 * Creates a trace object that generates stats on this client.
 *
 * @param {String} name The name of the new trace, prefix for all its stats.
 * @param {Array} [tags] The default tags set to all stats of the trace.
 * @param {Date} [now] The start time of the trace
 */

Client.prototype.trace = function(name, tags, now){
  return new Trace(this, name, tags, now);
};
