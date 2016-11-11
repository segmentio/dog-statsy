
/**
 * Expose `Hash`.
 */

module.exports = Hash;

/**
 * Initialize a new Hash.
 */

function Hash(){
  this.items = {};
  this.size = 0;
}

/**
 * Set sets `key`, `value`.
 *
 * @param {String} key
 * @param {Mixed} value
 */

Hash.prototype.set = function(key, value){
  if (!this.items.hasOwnProperty(key)) this.size++;
  this.items[key] = value;
};

/**
 * Each invokes `fn` for each pair.
 *
 * @param {Function} fn
 */

Hash.prototype.each = function(fn){
  var keys = Object.keys(this.items);
  var self = this;
  keys.forEach(function(key){
    fn(key, self.items[key]);
  });
};

/**
 * Get returns a `key`'s value or undefined.
 *
 * @param {String} key
 * @return {Mixed}
 */

Hash.prototype.get = function(key){
  return this.items[key];
};
