# setup.sh Node.js Detection and Idempotency

## Files to modify
- `install/setup.sh`

## Algorithm
1. Check `node --version` → if missing or < 18, install via `nvm` or system package manager
2. Check `npm list -g agentic-service` → if already installed, skip reinstall (idempotency)
3. Run `npm install -g agentic-service` only if not already installed
4. Print success message with `agentic-service` command

## Shell logic
```sh
# Node.js check
if ! command -v node &>/dev/null || [[ $(node -e "process.exit(+process.version.slice(1)<18)") ]]; then
  # install node via nvm or apt/brew
fi
# Idempotency check
if npm list -g agentic-service &>/dev/null; then
  echo "agentic-service already installed"
  exit 0
fi
npm install -g agentic-service
```

## Edge cases
- macOS: use `brew install node` if nvm not present
- Linux: use `apt-get` or `curl nvm`
- Windows: print manual install instructions, exit 1

## Test cases
- Running setup.sh twice → second run exits 0 without reinstalling
- Node < 18 → installs correct version
