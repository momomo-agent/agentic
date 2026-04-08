# setup.sh Node.js detection and idempotency

## Progress

Updated `install/setup.sh`: added `install_node()` function that auto-installs Node.js via nvm/brew (macOS) or nvm/apt (Linux), exits with instructions on Windows. Node check now installs instead of erroring. Added idempotency check for `AGENTIC_GLOBAL=1` path too.
