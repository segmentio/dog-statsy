
function Trace(client, name, tags, now) {
  if (!tags) {
    tags = { };
  }

  if (!now) {
    now = new Date;
  }

  this.client = client;
  this.name = name;
  this.tags = tagsArray(tags);
  this.start = now;
  this.items = [ ];
}

Trace.prototype.step = function(step, tags, now) {
  if (!tags) {
    tags = { };
  }

  if (!now) {
    now = new Date;
  }

  tags = tagsArray(tags);
  tags.push('step:' + step);
  this.items.push({ tags: tags, time: now });
};

Trace.prototype.complete = function(now) {
  var counter = this.name + '.count';
  var timer = this.name + '.seconds';
  var start = this.start;
  var ptime = this.start;
  var stats = this.client;
  var items = this.items;
  var tags = this.tags;

  if (!stats) {
    throw new Error("Trace.complete: called more than once");
  }

  if (!now) {
    now = new Date;
  }

  items.forEach(function(item) {
    stats.histogram(timer, seconds(ptime, item.time), tags.concat(item.tags));
    ptime = item.time;
  });

  stats.histogram(timer, seconds(start, now), tags.concat('step:request'));
  stats.incr(counter, 1, tags);

  this.client = null;
};

function tagsArray(tags) {
  var array = [ ];

  Object.keys(tags).forEach(function(key) {
    array.push(key + ':' + tags[key]);
  });

  return array;
}

function seconds(from, to) {
  return (to.getTime() - from.getTime()) / 1000.0;
}

module.exports = Trace;
