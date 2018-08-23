
var assert = require('assert');
var statsy = require('./');
var Trace = require('./trace');
var args;

beforeEach(function(){
  stats = statsy({
    bufferSize: 1024
  });
  stats.send = function(){
    var lines = arguments[0].split('\n');
    lines = lines.filter(function(s) { return s.length > 0; });
    for (var i in lines) {
      args.push(lines[i]);
    }
  };
  args = [];
});

describe('write', function(){
  it('should include global tags', function(){
    stats.tags = ['tag:global'];
    stats.write('key:1|c');
    stats.flush();
    assert.deepEqual(args, [
      'key:1|c|#tag:global'
    ]);
  });

  it('should include local tags', function(){
    stats.write('key:1|c', ['tag:local']);
    stats.flush();
    assert.deepEqual(args, [
      'key:1|c|#tag:local'
    ]);
  });

  it('should combine local and global tags', function(){
    stats.tags = ['tag:global'];
    stats.write('key:1|c', ['tag:local']);
    stats.flush();
    assert.deepEqual(args, [
      'key:1|c|#tag:global,tag:local'
    ]);
  });
});

describe('incr', function(){
  it('should write incr without tags or increments', function(){
    stats.incr('key');
    stats.flush();
    assert.deepEqual(args, [
      'key:1|c'
    ]);
  });

  it('should write incr with an increment', function(){
    stats.incr('key', 2);
    stats.flush();
    assert.deepEqual(args, [
      'key:2|c'
    ]);
  });

  it('should write incr with tags', function(){
    stats.incr('key', 1, ['tag:local']);
    stats.flush();
    assert.deepEqual(args, [
      'key:1|c|#tag:local'
    ]);
  })
});

describe('decr', function(){
  it('should write decr without tags or increments', function(){
    stats.decr('key');
    stats.flush();
    assert.deepEqual(args, [
      'key:-1|c'
    ]);
  });

  it('should write decr with an increment', function(){
    stats.decr('key', 2);
    stats.flush();
    assert.deepEqual(args, [
      'key:-2|c'
    ]);
  });

  it('should write incr with tags', function(){
    stats.decr('key', 1, ['tag:local']);
    stats.flush();
    assert.deepEqual(args, [
      'key:-1|c|#tag:local'
    ]);
  })
});

describe('trace', function(){
  it('should throw an error if the trace name is not specified', function(){
    assert.throws(stats.trace, Error, 'createing a trace with no name should throw an error');
  });

  it('should write an empty trace', function(){
    var trace = stats.trace('key', ['hello:world'], new Date(1000));
    trace.complete(new Date(2000));
    stats.flush();
    assert.deepEqual(args, [
      'key.seconds:1|h|#hello:world,step:request',
      'key.count:1|c|#hello:world'
    ]);
  });

  it('should write a trace with a couple of stats', function(){
    var trace = stats.trace('key', ['hello:world'], new Date(1000));
    trace.step('A', ['tag:a'], new Date(1100));
    trace.step('B', ['tag:b'], new Date(1300));
    trace.step('C', ['tag:c'], new Date(1600));
    trace.complete(new Date(2000));
    stats.flush();
    assert.deepEqual(args, [
      'key.seconds:0.1|h|#hello:world,tag:a,step:A',
      'key.seconds:0.2|h|#hello:world,tag:b,step:B',
      'key.seconds:0.3|h|#hello:world,tag:c,step:C',
      'key.seconds:1|h|#hello:world,step:request',
      'key.count:1|c|#hello:world'
    ]);
  });

  it('should write a trace with default tags and date', function(){
    Trace.now = function() { return new Date(1000) };
    var trace = stats.trace('key');

    Trace.now = function() { return new Date(1100) };
    trace.step('A');

    Trace.now = function() { return new Date(1300) };
    trace.step('B');

    Trace.now = function() { return new Date(1600) };
    trace.step('C');

    Trace.now = function() { return new Date(2000) };
    trace.complete();

    stats.flush();

    assert.deepEqual(args, [
      'key.seconds:0.1|h|#step:A',
      'key.seconds:0.2|h|#step:B',
      'key.seconds:0.3|h|#step:C',
      'key.seconds:1|h|#step:request',
      'key.count:1|c|#',
    ]);
  });
});

describe('flush', function () {
  it('should be called if flushInterval is exceeded', function(done) {
    const interval = 1000;
    const stats = new statsy({
      bufferSize: 1024,
      flushInterval: interval
    });
    stats.on('flush', done);
    stats.send = function(){
      var lines = arguments[0].split('\n');
      lines = lines.filter(function(s) { return s.length > 0; });
      for (var i in lines) {
        args.push(lines[i]);
      }
    };
    args = [];
    stats.incr('key', 1, ['tag:local']);
  }).timeout(3000);
});
