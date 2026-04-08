# setup.sh Node.js detection and idempotency

## Progress

### Completed
- Added idempotency checks to all Node.js installation paths
- Homebrew: checks `brew list node` before installing
- NVM: checks `nvm ls 18` before installing, uses existing version if present
- apt-get: checks if node command exists before running NodeSource setup
- NVM install script: checks if nvm.sh exists before downloading installer
- npm install already guarded with `[ ! -d node_modules ]`
- Global install already guarded with `npm list -g agentic-service`

### Changes Made
- install/setup.sh: Added existence checks to prevent reinstalling Node.js
- All install paths now skip if Node.js/nvm already present
- Safe to re-run multiple times without side effects

### Status
Implementation complete. Ready for review.
