# Design: SIGINT Graceful Drain

## File
- `src/server/api.js` or `bin/agentic-service.js`

## Implementation
```js
const connections = new Set()
server.on('connection', s => { connections.add(s); s.on('close', () => connections.delete(s)) })
process.on('SIGINT', () => {
  server.close(() => process.exit(0))
  connections.forEach(s => s.end())
})
```

## Test
- File: `test/sigint.test.js`
- Spawn server, open SSE connection, send SIGINT, assert process exits 0 and no ECONNRESET
