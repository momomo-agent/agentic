# Design: HTTPS/LAN 安全访问支持

## Files to Modify
- `bin/agentic-service.js`
- `src/server/api.js`

## Changes

### bin/agentic-service.js
```js
const useHttps = process.argv.includes('--https') || process.env.HTTPS_ENABLED === 'true';
const { createServer } = await import(useHttps ? './httpsServer.js' : 'http');
```

### src/server/httpsServer.js (新建)
```js
import https from 'https';
import { generateCert } from './cert.js';

export function createServer(app) {
  const { key, cert } = generateCert(); // selfsigned 包
  return https.createServer({ key, cert }, app);
}
```

### src/server/cert.js (新建)
```js
import selfsigned from 'selfsigned'; // npm i selfsigned

export function generateCert() {
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, { days: 365 });
  return { key: pems.private, cert: pems.cert };
}
```

## Function Signatures
```js
generateCert(): { key: string, cert: string }
createServer(app: Express): https.Server
```

## Edge Cases
- 无 `--https` flag → 使用原有 `http.createServer`，行为不变
- `selfsigned` 生成失败 → 抛出，启动中止，打印错误

## Test Cases (DBB)
- `--https` 启动后 `curl -k https://localhost:<port>/health` → 200
- 无 flag 启动后 `curl http://localhost:<port>/health` → 200
