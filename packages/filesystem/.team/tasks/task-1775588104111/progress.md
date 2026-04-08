# Fix OPFSBackend consistency: stat() directory support, delete() error handling, empty-path validation

## Progress

### Source Verification

All three features verified correct in `src/backends/opfs.ts`:
1. **stat() directory support** — TypeMismatchError → getDirHandle → isDirectory:true ✓
2. **delete() error handling** — NotFoundError silently returns, others wrapped as IOError ✓
3. **Empty-path validation** — validatePath throws IOError for empty string ✓

### Test Changes

**`test/opfs-m15.test.js`** — Added 3 browser-only tests:
- `stat("") throws IOError`
- `stat on missing path throws NotFoundError` (updated from null-return to throw per task-1775586684332)
- `stat on directory returns isDirectory: true`

**`test/opfs-stat-isdirectory.test.js`** — Updated mock to match new behavior:
- Mock `stat()` now throws `NotFoundError` for missing paths (was returning `null`)
- Updated test assertions from `assert.strictEqual(result, null)` to `assert.rejects`

### Result

599/602 tests pass (3 OPFS browser-only skipped as expected). No source code changes to OPFSBackend itself.
