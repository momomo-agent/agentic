# Design: Fix WebSocket disconnect — remove device from registry

## File to modify
- `test/` — whichever test exercises hub disconnect

## Root cause
`hub.js:232` already calls `unregisterDevice(deviceId)` on `ws.close`. The test likely doesn't trigger the close event or checks registry before the async handler runs.

## Fix
In the test, after calling `ws.close()` or `ws.emit('close')`, await a tick before asserting:
```js
ws.emit('close');
await new Promise(r => setImmediate(r));
assert.ok(!registry.has(deviceId));
```

## Function reference
- `hub.js:151` — `registry.delete(id)` inside `unregisterDevice(id)`
- `hub.js:232` — `ws.on('close', () => { if (deviceId) unregisterDevice(deviceId); })`

## Test to verify
Hub disconnect test: device not present in registry after close event fires
