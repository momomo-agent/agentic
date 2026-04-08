# Task Design: hub.js设备命令 — speak/display支持

## File to Modify
- `src/server/hub.js`

## Current State
`sendCommand` handles `capture` with a Promise; all other types resolve immediately with no validation. Unknown types are silently forwarded.

## Change: Add SUPPORTED set + throw for unknown types

```js
export function sendCommand(deviceId, command) {
  const device = registry.get(deviceId);
  if (!device) throw new Error(`Device not found: ${deviceId}`);

  const SUPPORTED = ['capture', 'speak', 'display'];
  if (!SUPPORTED.includes(command.type)) {
    throw new Error(`Unsupported command type: ${command.type}`);
  }

  const requestId = randomUUID();
  const { type, ...rest } = command;
  device.ws.send(JSON.stringify({ type: 'command', requestId, action: type, ...rest }));

  if (type !== 'capture') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingCaptures.delete(requestId);
      reject(new Error('Capture timeout'));
    }, 10000);
    pendingCaptures.set(requestId, { resolve, reject, timer, deviceId });
  });
}
```

## Wire format
- speak: `{ type: 'command', requestId, action: 'speak', text: '...' }`
- display: `{ type: 'command', requestId, action: 'display', content: '...' }`

Payloads forwarded via `...rest` — no structural change needed.

## Edge Cases
- Unknown type: throws synchronously before any send
- Device not in registry: existing throw handles it

## Test Cases (DBB-004..007)
- `sendCommand(id, { type: 'speak', text: 'hi' })` → device receives `action: 'speak'`
- `sendCommand(id, { type: 'display', content: '<h1>' })` → device receives `action: 'display'`
- `sendCommand(id, { type: 'capture' })` → returns Promise (no regression)
- `sendCommand(id, { type: 'fly' })` → throws `Unsupported command type: fly`
