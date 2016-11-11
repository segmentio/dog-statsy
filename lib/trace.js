
module.exports = Trace;

function Trace(client, name, tags, now) {
  if (!name) {
    throw new Error("traces cannot be created without a name")
  }

  if (!tags) {
    tags = [ ];
  }

  if (!now) {
    now = Trace.now();
  }

  this.client = client;
  this.name = name;
  this.tags = tags;
  this.start = now;
  this.steps = [ ];
}

Trace.prototype.step = function(step, tags, now) {
  if (!tags) {
    tags = [ ];
  }

  if (!now) {
    now = Trace.now();
  }

  tags.push('step:' + step);
  this.steps.push({ tags: tags, time: now });
};

Trace.prototype.complete = function(now) {
  var counter = this.name + '.count';
  var timer = this.name + '.seconds';
  var start = this.start;
  var ptime = this.start;
  var stats = this.client;
  var steps = this.steps;
  var tags = this.tags;

  if (!stats) {
    throw new Error(this.name + ": Trace.complete called more than once");
  }

  if (!now) {
    now = Trace.now();
  }

  steps.forEach(function(step) {
    stats.histogram(timer, seconds(ptime, step.time), tags.concat(step.tags));
    ptime = step.time;
  });

  stats.histogram(timer, seconds(start, now), tags.concat('step:request'));
  stats.incr(counter, 1, tags);

  this.client = null;
};

Trace.now = function() {
  return new Date;
}

function seconds(from, to) {
  return (to.getTime() - from.getTime()) / 1000.0;
}
