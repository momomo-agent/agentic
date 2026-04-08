# Design: setup.sh Node.js detection and idempotency

## File
- `install/setup.sh`

## Current Behavior
- Detects Node.js with `command -v node`
- Checks major version >= 18
- Guards global install with `npm list -g agentic-service`

## Verification
1. Run `bash install/setup.sh` twice — second run must print "already installed" and not re-run npm install
2. Confirm `NODE_MAJOR` check uses `node -e "process.stdout.write(...)"` (no trailing newline issues)

## Edge Cases
- Node present but version < 18: triggers install_node
- `AGENTIC_GLOBAL=1` env var: uses global install path
- Windows: exits with error message (not supported)

## Test Cases
- Mock `node --version` returning v16 → install_node called
- Mock `node --version` returning v20 → skip install
- Run twice with Node 20 present → no reinstall
