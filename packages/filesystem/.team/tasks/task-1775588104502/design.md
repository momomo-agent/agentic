# Task Design: Fix AgenticStoreBackend stat() mtime to use stored timestamp instead of Date.now()

## Summary

The vision gap: AgenticStoreBackend.stat() should return the actual modification time from when the file was written, not `Date.now()` called at stat() time. **This is already implemented** in `src/backends/agentic-store.ts`. This task's scope is **verification + test coverage**.

## Current Implementation Status

### set() stores mtime at write time (`src/backends/agentic-store.ts:41-48`)

```ts
async set(path: string, content: string): Promise<void> {
  this.validatePath(path)
  const p = this.normPath(path)
  try {
    await this.store.set(p, content)
    await this.store.set(p + '\x00mtime', String(Date.now()))
  } catch (e) { throw new IOError(String(e)) }
}
```

A separate metadata key (`path\x00mtime`) captures `Date.now()` at write time. The `\x00` (null byte) separator ensures metadata keys never collide with real file paths and are filtered from `list()`/`scanStream()` results.

### stat() reads stored mtime (`src/backends/agentic-store.ts:128-138`)

```ts
async stat(path: string): Promise<...> | null> {
  this.validatePath(path)
  try {
    const p = this.normPath(path)
    const value = await this.store.get(p)
    if (value == null) return null
    const mtimeRaw = await this.store.get(p + '\x00mtime')
    const mtime = mtimeRaw ? Number(mtimeRaw) : 0
    return { size: new Blob([String(value)]).size, mtime, isDirectory: false, permissions: { read: true, write: true } }
  } catch { return null }
}
```

`stat()` retrieves the stored `\x00mtime` key instead of calling `Date.now()`. Gracefully falls back to `mtime: 0` if the key is missing (legacy files written before mtime tracking).

### delete() cleans up metadata (`src/backends/agentic-store.ts:54-61`)

```ts
async delete(path: string): Promise<void> {
  this.validatePath(path)
  const p = this.normPath(path)
  try {
    await this.store.delete(p)
    await this.store.delete(p + '\x00mtime')
  } catch (e) { throw new IOError(String(e)) }
}
```

Both the content key and mtime metadata key are removed, preventing orphan keys.

### list() filters metadata keys (`src/backends/agentic-store.ts:71`)

```ts
const normalized = keys.filter(k => !k.includes('\x00')).map(...)
```

The `\x00` filter ensures mtime metadata keys (`/file.txt\x00mtime`) never appear in listing results.

## Existing Test Coverage

**File:** `test/agentic-store-mtime.test.js` — **comprehensive coverage already exists:**

| Test | Verifies |
|------|----------|
| Two stat() calls return same mtime | mtime is stored, not computed at stat() time |
| mtime is from write time, not stat() time | `before <= mtime <= afterSet` with 50ms delay |
| Overwrite updates mtime | `mtime2 > mtime1` after re-set() |
| delete() removes mtime key | No orphan `\x00mtime` keys after delete |
| Legacy file returns mtime: 0 | Missing mtime key → graceful `0` fallback |
| list() doesn't expose mtime keys | No `\x00` keys in listing |
| scanStream() doesn't scan mtime keys | No `\x00` keys in scan results |

## What the Developer Must Do

### Step 1: Verify implementation is correct
Read `src/backends/agentic-store.ts` and confirm the mtime logic matches the contract above. No source changes expected.

### Step 2: Review and potentially add tests
Run `test/agentic-store-mtime.test.js` and confirm all tests pass. Consider adding:

```js
// batchSet() stores mtime for each entry
test('batchSet() stores mtime for each entry', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  const before = Date.now()
  await backend.batchSet({ '/a.txt': 'aaa', '/b.txt': 'bbb' })
  const after = Date.now()
  const sa = await backend.stat('/a.txt')
  const sb = await backend.stat('/b.txt')
  assert.ok(sa !== null && sa.mtime >= before && sa.mtime <= after)
  assert.ok(sb !== null && sb.mtime >= before && sb.mtime <= after)
})
```

### Step 3: Edge case check
- **Non-numeric mtime value**: If `\x00mtime` key holds `'abc'`, `Number('abc')` returns `NaN`. Current code uses `mtimeRaw ? Number(mtimeRaw) : 0` — `NaN` is truthy, so it would return `NaN`. Consider adding `|| 0` fallback: `Number(mtimeRaw) || 0`. If this edge case matters, submit a CR for the small fix.

## Files

| File | Action |
|------|--------|
| `src/backends/agentic-store.ts` | Read-only — verify correctness, do NOT modify |
| `test/agentic-store-mtime.test.js` | Run and verify; optionally add batchSet test |

## Dependencies

- None. No source code changes needed.
- Complements task-1775586676543 (permissions field on stat()) which is already completed.

## Verification

```bash
npx tsx --test test/agentic-store-mtime.test.js  # all tests should pass
```
