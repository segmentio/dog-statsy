# dog-statsy [![Circle CI](https://circleci.com/gh/segmentio/dog-statsy.svg?style=shield)](https://circleci.com/gh/segmentio/dog-statsy)

  A dogstatsd client, with Typescript types.

## Installation

```
$ npm install dog-statsy
```

## Example

```js
const Client = require('dog-statsy')
const http = require('http')
const stats = new Client({})

setInterval(function(){
  const start = new Date
  http.get('http://yahoo.com', function(err, res){
    const ms = new Date - start
    stats.histogram('request.duration', ms, ['request:yahoo'])
  })
}, 1000)

```

## API

### Client([opts])

 Initialize a client with the given options:

 - `host` [localhost]
 - `port` [8125]
 - `prefix` optional prefix ('.' is appended)
 - `tags` array of tags to include in every call
 - `bufferSize` optional buffer size, if not defined, it will send the data immediately
 - `flushInterval` optional, only valid when bufferSize is defined. It will flush the buffer after the
 interval in miliseconds (if not empty)

### .gauge(name, val, [tags])

  Send gauge value.

### .meter(name, val, [tags])

  Send meter value.

### .set(name, val, [tags])

  Send set value.

### .count(name, val, [tags])

  Send count value.

### .incr(name, [val], [tags])

  Increment by `val` or 1.

### .decr(name, [val], [tags])

  Decrement by `val` or 1.

### .histogram(name, val, [tags])

 Send histogram value.

### .histogram(name)

 Return histogram delta function.

### .timer(name, val, [tags])

 Send timer value.

### .timer(name)

 Return timer delta function.

### .trace(name, [tags])

 Return a trace object.


### Trace

### .step(name, [tags])

 Adds a step to a trace.

### .complete()

 Completes a trace.

# License

  MIT
