
var assert = require('assert');
var statsy = require('./');
var args;

beforeEach(function(){
  stats = statsy();
  stats.send = function(){
    args.push([].slice.call(arguments));
  };
  args = [];
});

describe('write', function(){
  it('should include global tags', function(){
    stats.tags = ['tag:global'];
    stats.write('key:1|c');
    assert.deepEqual(args, [
      ['key:1|c|#tag:global']
    ]);
  });

  it('should include local tags', function(){
    stats.write('key:1|c', ['tag:local']);
    assert.deepEqual(args, [
      ['key:1|c|#tag:local']
    ]);
  });

  it('should combine local and global tags', function(){
    stats.tags = ['tag:global'];
    stats.write('key:1|c', ['tag:local']);
    assert.deepEqual(args, [
      ['key:1|c|#tag:global,tag:local']
    ]);
  });
});

describe('incr', function(){
  it('should write incr without tags or increments', function(){
    stats.incr('key');
    assert.deepEqual(args, [
      ['key:1|c']
    ]);
  });

  it('should write incr with an increment', function(){
    stats.incr('key', 2);
    assert.deepEqual(args, [
      ['key:2|c']
    ]);
  });

  it('should write incr with tags', function(){
    stats.incr('key', 1, ['tag:local']);
    assert.deepEqual(args, [
      ['key:1|c|#tag:local']
    ]);
  })
});

describe('decr', function(){
  it('should write decr without tags or increments', function(){
    stats.decr('key');
    assert.deepEqual(args, [
      ['key:-1|c']
    ]);
  });

  it('should write decr with an increment', function(){
    stats.decr('key', 2);
    assert.deepEqual(args, [
      ['key:-2|c']
    ]);
  });

  it('should write incr with tags', function(){
    stats.decr('key', 1, ['tag:local']);
    assert.deepEqual(args, [
      ['key:-1|c|#tag:local']
    ]);
  })
});

describe('trace', function(){
  it('should write an empty trace', function(){
    var trace = stats.trace('key', { hello: 'world' }, new Date(1000));
    trace.complete(new Date(2000));
    assert.deepEqual(args, [
      ['key.seconds:1|h|#hello:world,step:request'],
      ['key.count:1|c|#hello:world']
    ]);
  });

  it('shoudl write a trace with a couple of stats', function(){
    var trace = stats.trace('key', { hello: 'world' }, new Date(1000));
    trace.step('A', { tag: 'a' }, new Date(1100));
    trace.step('B', { tag: 'b' }, new Date(1300));
    trace.step('C', { tag: 'c' }, new Date(1600));
    trace.complete(new Date(2000));
    assert.deepEqual(args, [
      ['key.seconds:0.1|h|#hello:world,tag:a,step:A'],
      ['key.seconds:0.2|h|#hello:world,tag:b,step:B'],
      ['key.seconds:0.3|h|#hello:world,tag:c,step:C'],
      ['key.seconds:1|h|#hello:world,step:request'],
      ['key.count:1|c|#hello:world']
    ]);
  });
});
