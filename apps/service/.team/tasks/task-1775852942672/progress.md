# Fix server config-persistence test — rapid PUTs return 500

## Root Cause
Two issues: (1) port collisions from random port selection, (2) cross-test config file contamination — parallel vitest workers writing to the same `~/.agentic-service/config.json`.

## Fix
- `startServer(0)` for OS-assigned ports (already applied)
- Isolated config dir via `AGENTIC_CONFIG_DIR` + temp dir per test file
- Config module already uses `_configDir()`/`_configPath()` for dynamic path resolution

## Result
All 173 test files pass, 972 tests pass. Stable across 3 consecutive full-suite runs.
