# Task Design: HTTPS/LAN隧道安全访问

## Files
- `src/server/httpsServer.js` — already exists, verify
- `src/server/cert.js` — self-signed cert generation, already exists
- `bin/agentic-service.js` — update to use HTTPS server

## httpsServer.js (existing)
```js
import https from 'https'
import { generateCert } from './cert.js'
export function createServer(app) {
  const { key, cert } = generateCert()
  return https.createServer({ key, cert }, app)
}
```

## HTTP → HTTPS Redirect
Add in bin/agentic-service.js or api.js:
```js
import http from 'http'
const HTTP_PORT = 3001
http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host.split(':')[0]}:${PORT}${req.url}` })
  res.end()
}).listen(HTTP_PORT)
```

## LAN Access
- Bind HTTPS server to 0.0.0.0 (default for Node http.Server)
- Print LAN IP on startup: `https://<lan-ip>:3000`
- Use os.networkInterfaces() to find non-loopback IPv4

## Edge Cases
- cert generation fails → log error, fall back to HTTP
- port 3000 in use → log clear error, exit 1
- HTTP redirect port conflict → skip redirect, log warning

## Test Cases
1. https://localhost:3000 → 200
2. http://localhost:3001 → 301 Location: https://localhost:3000
3. LAN IP printed on startup
