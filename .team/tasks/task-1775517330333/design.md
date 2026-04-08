# Task Design: HTTPS/LAN安全访问

## Files to Modify

- **MODIFY** `src/server/cert.js` — persist cert to disk
- **MODIFY** `src/server/httpsServer.js` — load persisted cert

## cert.js

```js
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import selfsigned from 'selfsigned';

const CERT_DIR = path.join(os.homedir(), '.agentic-service', 'certs');
const KEY_FILE = path.join(CERT_DIR, 'server.key');
const CERT_FILE = path.join(CERT_DIR, 'server.cert');

// Returns { key, cert } — loads from disk or generates+saves
export async function getCert()
```

**Algorithm:**
1. Try `fs.readFile` KEY_FILE and CERT_FILE
2. If both exist → return `{ key, cert }`
3. Else → `selfsigned.generate([{name:'commonName',value:'localhost'}], {days:365})` → save to CERT_DIR → return

## httpsServer.js

```js
// Change createServer to async
export async function createServer(app) {
  const { key, cert } = await getCert();
  return https.createServer({ key, cert }, app);
}
```

## Edge Cases

- CERT_DIR doesn't exist → `fs.mkdir(CERT_DIR, { recursive: true })` before write
- Cert files corrupted → catch read error, regenerate
- LAN access: cert CN is `localhost`; browser will warn but connection succeeds

## Test Cases

- First run: cert files created in `~/.agentic-service/certs/`
- Second run: same cert files reused (no regeneration)
- Corrupted cert file: regenerated cleanly
- `https://localhost:<port>` accessible (with browser warning)
