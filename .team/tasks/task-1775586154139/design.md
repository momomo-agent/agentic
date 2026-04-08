# task-1775586154139 Technical Design — Fix failing agentic-store-stat.test.ts import path

## Problem

`test/backends/agentic-store-stat.test.ts` line 3 imports:
```ts
import { AgenticStoreBackend } from '../../src/backends/agentic-store.js'
```

This fails at runtime because the test runner cannot resolve `.js` extensions against TypeScript source files. This is the only failing test in the suite (1/483).

## Solution

**File to modify:** `test/backends/agentic-store-stat.test.ts`

**Change:** Update line 3 import to match the pattern used by all other `.ts` test files.

All other `.ts` test files in the project import from `../dist/index.js`:
- `test/create-default-backend.test.ts` → `from '../dist/index.js'`
- `test/concurrent.test.ts` → `from '../dist/index.js'`
- `test/edge-cases.test.ts` → `from '../dist/index.js'`
- `test/backends/agentic-store-normalization.test.js` → `from '../../dist/index.js'`

**Fix — line 3:**
```ts
// FROM:
import { AgenticStoreBackend } from '../../src/backends/agentic-store.js'
// TO:
import { AgenticStoreBackend } from '../../dist/index.js'
```

Run `npm test` to confirm 483/483 pass.

## Edge Cases

- The fix must not break other tests (the import is local to this file only)
- If the project uses `tsx` or `ts-node` loader, `.ts` extension may work
- If the project runs tests against compiled `dist/`, use the `dist/index.js` barrel

## Verification

- `npm test` exits with code 0
- All 5 test cases in `agentic-store-stat.test.ts` pass
- No other test file is affected
