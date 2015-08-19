
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
