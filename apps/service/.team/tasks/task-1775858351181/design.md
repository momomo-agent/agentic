# Task Design: Remove dead code adapters/embed.js

**Task:** task-1775858351181
**Module:** Runtime（服务运行时） — see ARCHITECTURE.md §3 Runtime
**Module Design:** `.team/designs/runtime.design.md`

## Problem

`src/runtime/adapters/embed.js` is dead code:
- Exports a single `embed(text)` that throws `'agentic-embed: not implemented'`
- No source file imports it (verified via grep across `src/`)
- The real embed path is `src/runtime/embed.js` → `agentic-embed` package directly
- ARCHITECTURE.md §已知限制 #2 documents it as dead code
- `vitest.config.js` has a stale alias `#agentic-embed` → this file, but no test uses that alias

## Files to Modify

### 1. DELETE `src/runtime/adapters/embed.js`
- 3-line file, throws unconditionally, zero imports from source code

### 2. EDIT `vitest.config.js`
**Current** (line 7):
```javascript
'#agentic-embed': path.resolve('./src/runtime/adapters/embed.js'),
```
**Action:** Remove the alias entry. If it's the only alias, remove the entire `resolve.alias` block.

**Verified current content** (16 lines):
```javascript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '#agentic-embed': path.resolve('./src/runtime/adapters/embed.js'),
    }
  },
  test: {
    coverage: {
      thresholds: { lines: 98, functions: 98, branches: 98, statements: 98 }
    }
  }
})
```

**After edit:**
```javascript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      thresholds: { lines: 98, functions: 98, branches: 98, statements: 98 }
    }
  }
})
```

The `path` import and `resolve.alias` block are removed since `#agentic-embed` is the only alias.

## Files NOT to Modify

- `src/runtime/embed.js` — the real embed module, unrelated
- `ARCHITECTURE.md` — architect-owned; known limitation #2 will be updated by architect after this task
- `.team/designs/runtime.design.md` — constraint about dead code will be outdated after removal; architect updates

## Test Impact

- **m76-embed-wiring.test.js** — tests that `#agentic-embed` is NOT in package.json imports. Does NOT import the alias. ✅ Unaffected.
- **m98-dead-imports.test.js** — tests that `#agentic-embed` is NOT in package.json imports. Does NOT import the alias. ✅ Unaffected.
- **runtime/embed.test.js** — tests `src/runtime/embed.js` (the real module). ✅ Unaffected.
- No test file imports `src/runtime/adapters/embed.js` or uses the `#agentic-embed` vitest alias.

## Implementation Steps

1. Delete `src/runtime/adapters/embed.js`
2. Edit `vitest.config.js`: remove `path` import, remove `resolve.alias` block
3. Run `npx vitest run` — confirm all tests pass (expect 981+ pass, 0 new failures)
4. Verify `src/runtime/adapters/` still contains `sense.js` and `voice/` directory

## ⚠️ Unverified Assumptions

None — all paths, imports, and references verified from source.
