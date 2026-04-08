# Design: Verify LAN Tunnel and HTTPS Cert Generation

## Files to Modify
- `src/tunnel.js` — refactor from script to exported function

## Current State
`src/tunnel.js` is a top-level script (runs on import). Needs to export `startTunnel(port)`.

## Refactor
```js
// src/tunnel.js
export function startTunnel(port: number): ChildProcess
```
- Move spawn logic into `startTunnel(port)`
- Remove top-level execution
- Return the child process so caller can attach SIGINT handler

## cert.js
Already correct — `generateCert()` returns `{ key, cert }` via `selfsigned`. Verify only:
- `selfsigned` is in `package.json` dependencies
- `generateCert()` called in `src/server/httpsServer.js`

## Test Cases
- Mock `execSync('which ngrok')` to succeed → `spawn('ngrok', ['http', port])` called
- Mock ngrok missing, cloudflared present → `spawn('cloudflared', ...)` called
- Both missing → `process.exit(1)` called
- `generateCert()` returns object with `key` and `cert` string properties
