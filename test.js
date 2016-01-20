
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

