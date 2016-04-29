
function Trace(client, name, tags, now) {
  if (!tags) {
    tags = [ ];
  }

  if (!now) {
    now = new Date;
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
    now = new Date;
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
    throw new Error("Trace.complete: called more than once");
  }

  if (!now) {
    now = new Date;
  }

  steps.forEach(function(step) {
    stats.histogram(timer, seconds(ptime, step.time), tags.concat(step.tags));
    ptime = step.time;
  });

  stats.histogram(timer, seconds(start, now), tags.concat('step:request'));
  stats.incr(counter, 1, tags);

  this.client = null;
};

function seconds(from, to) {
  return (to.getTime() - from.getTime()) / 1000.0;
}

module.exports = Trace;
