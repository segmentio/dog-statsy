
var assert = require('assert');
var statsy = require('..');
var aggregate = statsy.aggregate;

describe('Aggregate', function(){
  it('should default options', function(){
    var stats = aggregate(statsy());
    assert.equal(stats.interval, 500);
    assert.equal(stats.maxKeys, 50);
  });

  it('should override options', function(){
    var stats = aggregate(statsy(), {
      interval: 200,
      maxKeys: 500,
    });

    assert.equal(stats.interval, 200);
    assert.equal(stats.maxKeys, 500);
  });

  it('should flush metrics when timer is reached', function(done){
    var client = statsy();
    var stats = aggregate(client, { interval: 5 });
    var counts = [];

    client.count = function(){
      counts.push([].slice.call(arguments));
    };

    stats.incr('requests');
    stats.incr('responses');

    setTimeout(function(){
      assert.deepEqual(counts, [
        ['requests', 1, null, null],
        ['responses', 1, null, null],
      ]);
      done();
    }, 6);
  });

  it('should respect tags', function(){
    var client = statsy();
    var stats = aggregate(client, { interval: 5 });
    var counts = [];

    client.count = function(){
      counts.push([].slice.call(arguments));
    };

    stats.incr('requests', 1, ['host:segment.com']);
    stats.incr('responses', 1, ['host:segment.com']);
    stats.flush();

    assert.deepEqual(counts, [
      ['requests', 1, null, ['host:segment.com']],
      ['responses', 1, null, ['host:segment.com']],
    ]);
  });

  it('should flush when maxKeys is reached', function(){
    var client = statsy();
    var stats = aggregate(client, { maxKeys: 2 });
    var counts = [];

    client.count = function(){
      counts.push([].slice.call(arguments));
    };

    stats.incr('requests', 1, ['host:segment.com']);
    stats.incr('requests', 1, ['host:google.com']);
    stats.incr('requests', 1, ['host:twitter.com']);

    assert.deepEqual(counts, [
      ['requests', 1, null, ['host:segment.com']],
      ['requests', 1, null, ['host:google.com']],
      ['requests', 1, null, ['host:twitter.com']],
    ]);
  });

  it('should aggregate metrics', function(){
    var client = statsy();
    var stats = aggregate(client);
    var counts = [];

    client.count = function(){
      counts.push([].slice.call(arguments));
    };

    stats.incr('requests', 1, ['host:segment.com']);
    stats.incr('requests', 1, ['host:segment.com']);
    stats.incr('requests', 1, ['host:segment.com']);
    stats.flush();

    assert.deepEqual(counts, [
      ['requests', 3, null, ['host:segment.com']],
    ]);
  });
});
