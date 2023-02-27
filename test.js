const test = require('ava')
const dgram = require('dgram')
const Client = require('./')
const Trace = require('./trace')

function createClient() {
  return new Promise((resolve, reject) => {
    const server = dgram.createSocket('udp4')
    server.bind(0, '127.0.0.1')

    server.on('listening', () => {
      const address = server.address();
      const client = new Client({
        host: address.address,
        port: address.port,
        bufferSize: 32768,
      })

      const messages = new Promise((resolve, reject) => {
        server.on('message', (msg) => {
          resolve(msg.toString().split('\n').filter(function(s) { return s.length > 0 }))
        })
      })

      resolve({ client, messages })
    })
  })
}

test('messages include global tags', async t => {
  const { client, messages } = await createClient()
  client.tags = ['tag:global']
  client.write('key:1|c')
  client.flush()
  t.deepEqual(await messages, [
    'key:1|c|#tag:global',
  ])
})

test('messages include local tags', async t => {
  const { client, messages } = await createClient()
  client.write('key:1|c', ['tag:local'])
  client.flush()
  t.deepEqual(await messages, [
    'key:1|c|#tag:local',
  ])
})

test('messages combine local and global tags', async t => {
  const { client, messages } = await createClient()
  client.tags = ['tag:global']
  client.write('key:1|c', ['tag:local'])
  client.flush()
  t.deepEqual(await messages, [
    'key:1|c|#tag:global,tag:local',
  ])
})

test('write counter increment with default value and no tags', async t => {
  const { client, messages } = await createClient()
  client.incr('key')
  client.flush()
  const args = await messages
  t.deepEqual(await messages, [
    'key:1|c',
  ])
})

test('write counter increment with a value and no tags', async t => {
  const { client, messages } = await createClient()
  client.incr('key', 2)
  client.flush()
  const args = await messages
  t.deepEqual(await messages, [
    'key:2|c',
  ])
})

test('write counter increment with a value and tags', async t => {
  const { client, messages } = await createClient()
  client.incr('key', 1, ['tag:local'])
  client.flush()
  t.deepEqual(await messages, [
    'key:1|c|#tag:local',
  ])
})

test('write a counter decrement with default value and no tags', async t => {
  const { client, messages } = await createClient()
  client.decr('key')
  client.flush()
  t.deepEqual(await messages, [
    'key:-1|c'
  ])
})

test('write a counter decrement with a value and no tags', async t => {
  const { client, messages } = await createClient()
  client.decr('key', 2)
  client.flush()
  t.deepEqual(await messages, [
    'key:-2|c',
  ])
})

test('write a gauge assignment with a value and tags', async t => {
  const { client, messages } = await createClient()
  client.gauge('key', 42, ['A:1', 'B:2', 'C:3'])
  client.flush()
  t.deepEqual(await messages, [
    'key:42|g|#A:1,B:2,C:3',
  ])
})

test('write a histogram measures with tags', async t => {
  const { client, messages } = await createClient()
  client.histogram('key', 0.1234, ['A:1', 'B:2', 'C:3'])
  client.flush()
  t.deepEqual(await messages, [
    'key:0.1234|h|#A:1,B:2,C:3',
  ])
})

test('write a histogram measure with completion callback', async t => {
  const { client, messages } = await createClient()
  const cb = client.histogram('key')
  cb()
  client.flush()
  const resolvedMessages = await messages
  t.deepEqual(resolvedMessages.length, 1)
  const messageRegex = /^key:(\d+)|h|$/
  t.regex(resolvedMessages[0], messageRegex)
  const [, value] = messageRegex.exec(resolvedMessages[0])
  const valueAsNumber = Number.parseInt(value)
  t.true(!Number.isNaN(valueAsNumber))
})

test('should throw an error if the trace name is not specified', t => {
  const client = new Client({})
  t.throws(() => client.trace())
})

test('write an empty trace', async t => {
  const { client, messages } = await createClient()
  const trace = client.trace('key', ['hello:world'], new Date(1000))
  trace.complete(new Date(2000))
  client.flush()
  t.deepEqual(await messages, [
    'key.seconds:1|h|#hello:world,step:request',
    'key.count:1|c|#hello:world',
  ])
})

test('write a trace with a couple of stats', async t => {
  const { client, messages } = await createClient()
  const trace = client.trace('key', ['hello:world'], new Date(1000))
  trace.step('A', ['tag:a'], new Date(1100))
  trace.step('B', ['tag:b'], new Date(1300))
  trace.step('C', ['tag:c'], new Date(1600))
  trace.complete(new Date(2000))
  client.flush()
  t.deepEqual(await messages, [
    'key.seconds:0.1|h|#hello:world,tag:a,step:A',
    'key.seconds:0.2|h|#hello:world,tag:b,step:B',
    'key.seconds:0.3|h|#hello:world,tag:c,step:C',
    'key.seconds:1|h|#hello:world,step:request',
    'key.count:1|c|#hello:world',
  ])
})

test('should write a trace with default tags and date', async t => {
  const { client, messages } = await createClient()

  Trace.now = function() { return new Date(1000) }
  const trace = client.trace('key')

  Trace.now = function() { return new Date(1100) }
  trace.step('A')

  Trace.now = function() { return new Date(1300) }
  trace.step('B')

  Trace.now = function() { return new Date(1600) }
  trace.step('C')

  Trace.now = function() { return new Date(2000) }
  trace.complete()

  client.flush()

  t.deepEqual(await messages, [
    'key.seconds:0.1|h|#step:A',
    'key.seconds:0.2|h|#step:B',
    'key.seconds:0.3|h|#step:C',
    'key.seconds:1|h|#step:request',
    'key.count:1|c|#',
  ])
})

test('messages are flushed when the flush interval is exceeded', async t => {
  const { client, messages } = await createClient()
  client.setFlushInterval(500) // 0.5s
  client.incr('key', 1, ['tag:local'])
  t.deepEqual(await messages, [
    'key:1|c|#tag:local',
  ])
})
