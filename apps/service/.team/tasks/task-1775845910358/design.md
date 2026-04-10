# Task Design: Fix stale m95-architecture-docs tests

**Task ID:** task-1775845910358
**Module:** Testing (verifies ARCHITECTURE.md content)
**ARCHITECTURE.md Sections:** §5 Store, §10 agentic-embed

## Problem

5 tests in `test/m95-architecture-docs.test.js` (lines 77-105) fail because they assert `memory.js` API documentation in ARCHITECTURE.md. `memory.js` was refactored away — its functionality is now split between:
- `src/store/index.js` — KV storage (get/set/del/delete)
- `src/runtime/embed.js` — vector embedding (embed(text))

ARCHITECTURE.md already documents these replacements:
- §5 Store (lines 314-322): `get(key)`, `set(key, value)`, `del(key)`, `delete(key)`
- §10 agentic-embed (lines 380-387): `embed(text) → number[]`

## Failing Tests (all in describe block lines 77-105)

| # | Test name | Line | Asserts | Why it fails |
|---|-----------|------|---------|-------------|
| 1 | `contains memory.js in Runtime section` | 78-80 | `arch.toMatch(/memory\.js/)` | memory.js removed from ARCHITECTURE.md |
| 2 | `documents add(text) function` | 82-84 | `arch.toMatch(/add\(text\)/)` | old memory API |
| 3 | `documents remove(key) function` | 86-88 | `arch.toMatch(/remove\(key\)/)` | old memory API |
| 4 | `documents search(query, topK) function` | 94-96 | `arch.toMatch(/search\(query.*topK/)` | old memory API |
| 5 | `documents promise-based lock for serial writes` | 102-104 | `arch.toMatch(/lock\|串行\|serial/)` | old memory API |

Note: Test #4 at line 90-92 (`documents delete() alias for remove`) actually PASSES because ARCHITECTURE.md §5 Store contains `delete(key)` which matches `/delete|别名/`.

## Files to Modify

- `test/m95-architecture-docs.test.js` — lines 77-105 only

## Implementation Plan

Replace the describe block `m95 — ARCHITECTURE.md documents memory.js API` (lines 77-105) with a new describe block that verifies the actual store + embed documentation:

```javascript
describe('m95 — ARCHITECTURE.md documents store + embed API', () => {
  it('contains store/index.js in Store section', () => {
    expect(arch).toMatch(/store\/index\.js/)
  })

  it('documents get(key) function', () => {
    expect(arch).toMatch(/get\(key\)/)
  })

  it('documents set(key, value) function', () => {
    expect(arch).toMatch(/set\(key,?\s*value\)/)
  })

  it('documents del(key) function', () => {
    expect(arch).toMatch(/del\(key\)/)
  })

  it('documents delete as alias for del', () => {
    expect(arch).toMatch(/delete\(key\)/)
  })

  it('documents embed(text) function', () => {
    expect(arch).toMatch(/embed\(text\)/)
  })

  it('documents embed returns number array', () => {
    expect(arch).toMatch(/number\[\]/)
  })
})
```

### Verification against ARCHITECTURE.md content

Verified these strings exist in ARCHITECTURE.md:
- Line 317: `store/index.js` ✅
- Line 318: `get(key) → Promise<any>` ✅
- Line 319: `set(key, value) → Promise<void>` ✅
- Line 320: `del(key) → Promise<void>` ✅
- Line 321: `delete(key) → Promise<void>` ✅
- Line 384: `embed(text) → number[]` ✅

## Test Cases

After the fix:
- All 7 new tests should pass (verified against actual ARCHITECTURE.md content above)
- All 29 previously-passing tests remain passing (no changes to other describe blocks)
- Total: 34 → 36 tests (5 removed, 7 added), 0 failures

## ⚠️ Unverified Assumptions

None — all assertions verified against actual ARCHITECTURE.md content.
