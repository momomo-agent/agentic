# Design: Fix tunnel.js export + verify LAN tunnel + HTTPS cert

## Problem
`tunnel.js` runs as a top-level script — no exported `startTunnel(port)` function. Callers (e.g. `api.js`, tests) cannot import and invoke it programmatically.

## Files to Modify
- `src/tunnel.js` — refactor to export `startTunnel(port)`

## Function Signature
```js
// src/tunnel.js
export function startTunnel(port: number): void
```

## Algorithm
1. Move the `isInstalled` helper and spawn logic inside `startTunnel(port)`.
2. Use the `port` parameter instead of `process.env.PORT`.
3. Keep SIGINT handler inside the function (registered once on call).
4. Remove top-level side-effect execution.

## Resulting Shape
```js
import { spawn, execSync } from 'child_process';

function isInstalled(cmd) {
  try { execSync(`which ${cmd}`, { stdio: 'ignore' }); return true; }
  catch { return false; }
}

export function startTunnel(port) {
  let proc;
  if (isInstalled('ngrok')) {
    proc = spawn('ngrok', ['http', port], { stdio: 'inherit' });
  } else if (isInstalled('cloudflared')) {
    proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], { stdio: 'inherit' });
  } else {
    console.error('Error: neither ngrok nor cloudflared is installed.');
    return;
  }
  process.on('SIGINT', () => { proc.kill(); process.exit(0); });
}
```

## Edge Cases
- Neither tool installed → log error and return (no `process.exit` so caller stays alive).
- Called multiple times → SIGINT handler stacks; acceptable for single-use CLI context.

## cert.js — No Changes Needed
`src/server/cert.js` already exports `generateCert()` correctly. Verification only.

## Test Cases
1. `import { startTunnel } from '../src/tunnel.js'` resolves without error.
2. `startTunnel(3000)` spawns ngrok or cloudflared when installed.
3. When neither is installed, logs error and returns without throwing.
4. `generateCert()` returns `{ key, cert }` strings (non-empty).
