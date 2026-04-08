# OPFSBackend empty-path validation

## Progress

### Changes Made

1. **`src/backends/opfs.ts`** - Added `this.validatePath(path)` as the first line in `stat()` method (line 135)
   - Now `stat('')` throws `IOError('Path cannot be empty')` consistently with `get()`, `set()`, `delete()`

2. **`test/backends/opfs.test.js`** - Extended existing empty path test
   - Added `await assert.rejects(() => backend.stat(''), /empty/i)` alongside existing get/set/delete assertions

### Notes
- One-line src change + one-line test addition
- No signature changes needed
- Browser-only test (skips in Node.js)
