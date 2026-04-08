# Design: setup.sh Node.js Detection and Idempotency

## File
- `install/setup.sh`

## Node.js Detection
```bash
NODE_VER=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VER" ] || [ "$NODE_VER" -lt 18 ]; then
  echo "Node.js 18+ required. Install from https://nodejs.org" && exit 1
fi
```

## Idempotency Guards
- Wrap each install step: `command -v ollama >/dev/null || <install>`
- Wrap npm install: `[ -d node_modules ] || npm ci`
