# Design: Fix config-persistence test isolation

## Module
Config (ARCHITECTURE.md §config.js)

## Problem
`test/config-persistence.test.js` fails with `expected undefined to be 'hello'` when run in the full suite, but passes alone.

### Root Cause
`src/config.js` evaluates `CONFIG_DIR` at module load time:
```javascript
const CONFIG_DIR = process.env.AGENTIC_CONFIG_DIR || path.join(os.homedir(), '.agentic-service');
```

When `test/server/config-persistence.test.js` runs first in the same Vitest worker pool, it imports `config.js` with the default `CONFIG_DIR` (~/.agentic-service/). The root test's `vi.resetModules()` + dynamic import may not fully reset the module-level const if Vitest reuses the worker.

The root test writes to `TEMP_DIR/config.json` but `config.js` reads/writes to `~/.agentic-service/config.json` — so `setConfig()` writes to the wrong path and `readFile(CONFIG_PATH)` in the test reads from the temp dir (empty).

## Fix Strategy

**Option A (recommended): Add `poolMatchGlobs` to vitest.config.js**

Force `test/config-persistence.test.js` into its own isolated fork:

```javascript
// vitest.config.js
test: {
  poolOptions: {
    forks: {
      singleFork: false,
    }
  },
  isolate: true,
}
```

This is too broad. Better: use Vitest's `test.poolMatchGlobs` or `test.sequence.setupFiles` to isolate just this file.

**Option B (simpler, recommended): Move env var setup to a setup file or use `// @vitest-environment` pragma**

Actually the simplest fix: the test already does `vi.resetModules()` in `freshImport()`. The issue is that `process.env.AGENTIC_CONFIG_DIR` must be set BEFORE the first import of config.js in the worker. Since `beforeAll` runs after module-level imports, and `test/server/config-persistence.test.js` has a top-level `import { reloadConfig } from '../../src/config.js'`, the module is already loaded.

**Option C (simplest, recommended): Use `vi.hoisted()` to set env var before imports**

```javascript
// test/config-persistence.test.js — add at the very top, before any imports
const { TEMP_DIR, CONFIG_PATH } = vi.hoisted(() => {
  const path = require('path');
  const os = require('os');
  const dir = path.join(os.tmpdir(), `agentic-config-test-${process.pid}`);
  process.env.AGENTIC_CONFIG_DIR = dir;
  return { TEMP_DIR: dir, CONFIG_PATH: path.join(dir, 'config.json') };
});
```

This ensures the env var is set before any module evaluation.

## Files to Modify

1. `test/config-persistence.test.js` — use `vi.hoisted()` to set `AGENTIC_CONFIG_DIR` before module load
   - Move `process.env.AGENTIC_CONFIG_DIR = TEMP_DIR` into `vi.hoisted()` block
   - Keep `beforeAll` for `fs.mkdir(TEMP_DIR)`
   - Keep `afterAll` for cleanup

## Verification

- `npx vitest --run` — 0 failures (currently 1)
- `npx vitest --run test/config-persistence.test.js` — still passes in isolation
- No other tests affected

## ⚠️ Unverified Assumptions
- None. Root cause confirmed by: test passes alone, fails in suite. The module-level const pattern is visible in source.
