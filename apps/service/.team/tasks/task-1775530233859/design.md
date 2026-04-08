# Task Design: LAN tunnel via ngrok or cloudflare

## Files to Create/Modify

- `src/tunnel.js` — new file, tunnel entrypoint
- `package.json` — add `"tunnel": "node src/tunnel.js"` to scripts

## src/tunnel.js

```js
import { spawn, execSync } from 'child_process';

function isInstalled(cmd) {
  try { execSync(`which ${cmd}`, { stdio: 'ignore' }); return true; }
  catch { return false; }
}

const PORT = process.env.PORT || 3000;

let proc;
if (isInstalled('ngrok')) {
  proc = spawn('ngrok', ['http', PORT], { stdio: 'inherit' });
} else if (isInstalled('cloudflared')) {
  proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], { stdio: 'inherit' });
} else {
  console.error('Error: neither ngrok nor cloudflared is installed.');
  console.error('Install one: https://ngrok.com or https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/');
  process.exit(1);
}

process.on('SIGINT', () => { proc.kill(); process.exit(0); });
```

## package.json scripts addition

```json
"tunnel": "node src/tunnel.js"
```

## Notes
- ngrok prints its URL to stdout automatically; cloudflared prints `https://...trycloudflare.com`
- No npm deps needed — uses only Node built-ins + system binaries
- PORT env var respected for non-default ports

## Edge Cases
- Neither tool installed → clear error message + install links, exit 1
- SIGINT → kill child process cleanly
