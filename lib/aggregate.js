
/**
 * Module dependencies.
 */

var Hash = require('./hash');

/**
 * Expose `Aggregator`.
 */

module.exports = Aggregator;

/**
 * Initialize a new Aggregator.
 */

function Aggregator(client, opts){
  this.interval = opts.interval || 500;
  this.maxKeys = opts.maxKeys || 50;
  this.client = client;
  this.gauge = client.gauge.bind(client);
  this.set = client.set.bind(client);
  this.histogram = client.histogram.bind(client);
  this.timer = client.timer.bind(client);
  this.meter = client.meter.bind(client);
  this.trace = client.trace.bind(client);
  this.reset();
}

/**
 * Reset resets aggregates and the flusher.
 *
 * @return {Aggregator}
 */

Aggregator.prototype.reset = function(){
  this.counts = new Hash;
  clearTimeout(this.timeout);
  this.timeout = setTimeout(this.flush.bind(this), this.interval);
  this.timeout.unref();
  return this;
};

/**
 * Flush will flush all metrics into the client.
 *
 * @return {Aggregator}
 */

Aggregator.prototype.flush = function(){
  var self = this;

  this.counts.each(function(key, value){
    var u = unpack(key);
    self.client.count(u.key, value, null, u.tags);
  });

  this.reset();
  return this;
};

/**
 * Count adds `value` to `key`'s count.
 *
 * @param {String} key
 * @param {Number} value
 * @param {Array} tags
 * @return {Aggregator}
 */

Aggregator.prototype.count = function(key, value, tags){
  key = pack(key, tags);
  var prev = this.counts.get(key) || 0;
  this.counts.set(key, prev + value);
  this.cap();
  return this;
};

/**
 * Incr increments `key` by `n`.
 *
 * @param {String} key
 * @param {Number} n
 * @param {Array} tags
 * @return {Aggregator}
 */

Aggregator.prototype.incr = function(key, n, tags){
  if (null == n) n = 1;
  return this.count(key, n, tags);
};

/**
 * Decr decrements `key` by `n`.
 *
 * @param {String} key
 * @param {Number} n
 * @param {Array} tags
 * @return {Aggregator}
 */

Aggregator.prototype.decr = function(key, n, tags){
  if (null == n) n = 1;
  return this.count(key, -n, tags);
};

/**
 * Cap flushes any aggregator that exceeds `maxKeys`.
 *
 * @return {Aggregator}
 */

Aggregator.prototype.cap = function(){
  if (this.counts.size > this.maxKeys) this.flush();
  return this;
};

/**
 * Pack packs the given `key` with `tags`.
 *
 * @param {String} key
 * @param {Array} tags
 * @return {Aggregator}
 */

function pack(key, tags){
  var tag = (tags || []).sort().join(',');
  return [key, tag].join(';;');
}

/**
 * Unpack unpacks the given `key`.
 *
 * The function returns an object
 * with the original key and an array of tags.
 *
 * @param {String} key
 * @return {Object}
 */

function unpack(key){
  var parts = key.split(';;');
  var key = parts[0];
  var tags = parts[1] == ''
    ? null
    : parts[1].split(',');

  return {
    key: key,
    tags: tags,
  };
}
