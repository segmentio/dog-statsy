
# dog-statsy

  A dogstatsd client.

## Installation

```
$ npm install dog-statsy
```

## Example

```js

var Client = require('dog-statsy');
var http = require('http');
var stats = new Client;

setInterval(function(){
  var start = new Date;
  http.get('http://yahoo.com', function(err, res){
    stats.histogram('request.duration', ['request:yahoo']);
  });
}, 1000);

```

## API

### Client([opts])

 Initialize a client with the given options:

 - `host` [localhost]
 - `port` [8125]
 - `prefix` optional prefix ('.' is appended)
 - `tags` array of tags to include in every call

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

# License

  MIT
