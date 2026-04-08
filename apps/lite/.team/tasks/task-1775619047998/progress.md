# Fix agentic-core symlink and broken tests

## Progress

### 1. Identified root cause
- `package.json` had `"agentic-core": "link:../agentic-core"` pointing to standalone project at parent directory
- The correct local package is at `packages/agentic-core`
- The symlink in `node_modules/agentic-core` was resolving to the wrong project (version 0.2.0 instead of 0.1.0)

### 2. Fixed symlink
- Changed dependency to `"agentic-core": "link:./packages/agentic-core"` in package.json
- Ran `pnpm install --no-frozen-lockfile` to update symlink and lockfile

### 3. Verified
- All 174 tests pass (32 test files, 0 failures)
- No test imports needed fixing — `src/providers/index.ts` and `src/providers/provider.ts` already re-export from `agentic-core`, they just needed the correct package resolved

### Files changed
- `package.json` — one line: dependency path fix
- `pnpm-lock.yaml` — auto-updated by pnpm install
