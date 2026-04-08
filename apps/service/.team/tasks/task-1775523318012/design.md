# Task Design: HTTPS / LAN Tunnel for Multi-Device Access

## Goal
Wire existing `httpsServer.js` into the startup flow so HTTPS is available for LAN access.

## Files to Modify
- `bin/agentic-service.js` — use `createServer` from `httpsServer.js` when HTTPS enabled

## Logic

```js
// bin/agentic-service.js
import { createServer as createHttpsServer } from '../src/server/httpsServer.js';
import http from 'http';

const useHttps = process.env.HTTPS === 'true' || process.argv.includes('--https');
const server = useHttps ? createHttpsServer(app) : http.createServer(app);
const port = process.env.PORT || 3000;
server.listen(port, () => {
  const proto = useHttps ? 'https' : 'http';
  console.log(`Listening on ${proto}://localhost:${port}`);
});
```

## Edge Cases
- Self-signed cert causes browser warning — log a note to user on startup
- If `selfsigned` package missing, fall back to HTTP and warn

## Test Cases
- `HTTPS=true node bin/agentic-service.js` starts without error
- `GET https://localhost:<port>/api/status` returns 200 (with `NODE_TLS_REJECT_UNAUTHORIZED=0`)
