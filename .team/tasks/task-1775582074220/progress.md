# Implement $VAR environment variable substitution

## Progress

- Added `env: Map<string, string>`, `setEnv()`, `substituteEnv()` to `AgenticShell`
- `substituteEnv()` called at top of `exec()` before any parsing
- 5 tests added in `test/env-var-substitution-m21.test.ts` — all passing
