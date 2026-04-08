# Task Design: setup.sh完善 + npx入口验证

## Files
- `install/setup.sh` — update
- `bin/agentic-service.js` — verify shebang + package.json bin field

## setup.sh Changes

```sh
#!/bin/sh
set -e
# Node check (existing)
# NEW: support curl-pipe global install
if [ "$AGENTIC_GLOBAL" = "1" ]; then
  npm install -g agentic-service
  exec agentic-service "$@"
fi
# existing local install logic...
```

Usage: `curl -fsSL https://raw.githubusercontent.com/momomo/agentic-service/main/install/setup.sh | AGENTIC_GLOBAL=1 sh`

## package.json bin field
```json
{ "bin": { "agentic-service": "bin/agentic-service.js" } }
```

## bin/agentic-service.js
- Must have `#!/usr/bin/env node` as first line
- File must be chmod +x (set in package.json `prepare` or manually)

## Test Cases
- `bin/agentic-service.js` first line is shebang
- `package.json` has `bin.agentic-service` pointing to `bin/agentic-service.js`
- setup.sh contains `npm install -g` path
