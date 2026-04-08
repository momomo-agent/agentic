# Task Design: Verify cross-backend consistency test coverage completeness

## Files to Audit/Modify

| File | Change |
|------|--------|
| `test/cross-backend.test.js` | Add `permissions` assertion, add `MemoryStorage`/`LocalStorageBackend` stat coverage |
| `test/cross-backend-extra.test.js` | Verify scanStream/edge-case coverage is complete |

## Current Test Matrix

**cross-backend.test.js** — 5 backends × methods:

| Method | NodeFs | AgenticStore | Memory | LocalStorage | SQLite |
|--------|--------|-------------|--------|-------------|--------|
| get | ✓ | ✓ | ✓ | ✓ | ✓ |
| set | ✓ | ✓ | ✓ | ✓ | ✓ |
| delete | ✓ | ✓ | ✓ | ✓ | ✓ |
| list | ✓ | ✓ | ✓ | ✓ | ✓ |
| list(prefix) | ✓ | ✓ | ✓ | ✓ | ✓ |
| scan | ✓ | ✓ | ✓ | ✓ | ✓ |
| batchGet | ✓ | ✓ | ✓ | ✓ | ✓ |
| batchSet | ✓ | ✓ | ✓ | ✓ | ✓ |
| stat (size) | ✓ | ✓ | ✓ | ✓ | ✓ |
| stat NotFoundError | ✓ | ✓ | ✓ | ✓ | ✓ |
| stat (isDir) | ✓ | ✓ | ✗ | ✗ | ✗ |
| empty path | ✓ | ✓ | ✓ | ✓ | ✓ |

**cross-backend-extra.test.js** — 5 backends × methods:

| Method | Coverage |
|--------|----------|
| scanStream match | ✓ |
| scanStream no-match | ✓ |
| scanStream = scan consistency | ✓ |
| batchGet all-missing | ✓ |
| batchSet/batchGet round-trip | ✓ |
| set overwrite | ✓ |
| delete removes from list | ✓ |

## Gaps to Fill

1. **`MemoryStorage.stat()`** — added by task-1775586676543. Existing stat tests in the `for` loop will auto-cover it.
2. **`LocalStorageBackend.stat()`** — added by task-1775586676543. Same.
3. **`permissions` field assertion** — add to stat tests after task-1775586676543.
4. **`stat('')` empty-path test** — add test that `backend.stat('')` throws `IOError` for all backends.
5. **`stat('/missing')` NotFoundError test** — add test that `backend.stat('/missing')` throws `NotFoundError` (per DBB-004).

## Implementation

### Step 1: Add permissions assertion to stat tests

In `cross-backend.test.js`, update the stat test (line 152-159):

```ts
test(`${name}: stat returns size for existing file`, async () => {
  await backend.set('/stat-file', 'hello')
  const s = await backend.stat?.('/stat-file')
  if (s !== undefined) {
    assert.equal(s.isDirectory, false)
    assert.ok(s.size >= 5)
    assert.ok(typeof s.mtime === 'number')
    // NEW: verify permissions field
    assert.ok(s.permissions !== undefined, 'stat should include permissions')
    assert.equal(typeof s.permissions.read, 'boolean')
    assert.equal(typeof s.permissions.write, 'boolean')
  }
})
```

### Step 2: Add stat('') and stat('/missing') validation tests

Inside the `for` loop, add:

```ts
test(`${name}: stat with empty path throws IOError`, async () => {
  if (backend.stat) {
    await assert.rejects(() => backend.stat!(''), (err: any) => err.name === 'IOError')
  }
})

test(`${name}: stat on missing file throws NotFoundError`, async () => {
  if (backend.stat) {
    await assert.rejects(
      () => backend.stat!('/nonexistent-file-' + name),
      (err: any) => err.name === 'NotFoundError'
    )
  }
})
```

### Step 3: Verify coverage matrix

After tasks 1 and 4 are complete, run the full test suite and confirm all backends pass. Document any remaining gaps.

## Dependencies

- Depends on task-1775586676543 (adds `stat()` to MemoryStorage and LocalStorageBackend, adds `permissions` to all)
- Depends on task-1775586684332 (standardizes error handling for stat() empty path)

## Test Cases

1. All 5 backends pass `stat()` test with `permissions` field assertion
2. All 5 backends reject `stat('')` with `IOError`
3. All 5 backends reject `stat('/nonexistent')` with `NotFoundError`
4. Full test suite passes with no regressions
