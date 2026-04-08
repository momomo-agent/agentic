# Design: setup.sh Node.js detection and idempotency

## File to verify/modify
- `install/setup.sh`

## Current state
Already checks `command -v node` before calling `install_node`.
Already checks `npm list -g agentic-service` before installing.

## Verify idempotency
1. `command -v node` guard → skip install if node >= 18 present
2. Global install branch: `npm list -g agentic-service` guard → print "already installed", skip
3. Local branch: `npm list -g agentic-service` guard → skip `npm install --prefer-offline`

## Fix if needed
The local branch currently runs `npm install --prefer-offline` unconditionally. Add guard:
```sh
if [ ! -d node_modules ]; then
  npm install --prefer-offline
fi
```

## Test cases
- Run on system with node >= 18 and existing install → no installs triggered, exits 0
- Run on clean system → installs node and packages, exits 0
