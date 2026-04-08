# Task Design: Fix AgenticStoreBackend scan() to stream instead of loading full content

## Files to Verify/Modify

| File | Change |
|------|--------|
| `src/backends/agentic-store.ts` | Verify scanStream() is already streaming (no change expected) |
| `test/cross-backend-scanstream.test.js` | Add memory-efficiency assertion if needed |

## Analysis of Current Implementation

`AgenticStoreBackend.scanStream()` at lines 67-77:

```ts
async *scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }> {
  for (const key of (await this.store.keys()).filter(k => !k.includes('\x00'))) {
    const normalized = key.startsWith('/') ? key : '/' + key
    const value = await this.store.get(key)     // loads ONE file at a time
    if (typeof value !== 'string') continue
    const lines = value.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pattern)) yield { path: normalized, line: i + 1, content: lines[i] }
    }
  }
}
```

**Assessment:** This IS already streaming per-key. It:
1. Gets all keys (lightweight — just key names)
2. Iterates one key at a time
3. Loads ONE value via `this.store.get(key)`
4. Splits into lines and yields matches
5. The value can be garbage collected after the loop iteration

The only way to improve would be if the `AgenticStore` interface supported cursor-based iteration or lazy value loading — but it doesn't. The `keys()` call returns all keys, and `get()` is the only way to read values.

**Contrast with concern:** The original concern was "loads all file content into memory before scanning." This would only be true if `scan()` collected all results from `scanStream()` into a single array — but that's exactly what `scan()` does (line 79-83). However, `scan()` is defined by the `StorageBackend` interface to return an array, so this is expected behavior. The streaming variant `scanStream()` is the memory-efficient alternative available to callers who want incremental results.

## Decision

**No source code changes needed.** The streaming implementation is correct.

Focus on verification:
1. Confirm `scanStream()` yields results incrementally (not all at once)
2. Confirm cross-backend test at `test/cross-backend-scanstream.test.js` already covers this

## Test Cases (Verification Only)

1. `scanStream()` yields at least 2 results for matching pattern across 2 files — already tested in `cross-backend-extra.test.js:83-99`
2. `scanStream()` returns empty for no-match — already tested at line 101-107
3. `scanStream()` results match `scan()` results — already tested at line 109-117

## Dependencies

- None. This is a verification-only task.
