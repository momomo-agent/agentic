# Design: Fix README performance table and scan() example

## File to modify
- `README.md` — two targeted edits

## Change 1: Performance table
The table at line 32 already has the required columns (`Read (large)`, `Storage Limit`, `Browser Support`, `Best For`). Verify all backend rows are populated. If any cell is missing, fill it in. No structural change needed.

Rows to verify/complete:
```
| Backend            | Read (small) | Write (small) | Read (large) | Storage Limit | Browser Support                        | Best For |
|--------------------|-------------|---------------|-------------|---------------|----------------------------------------|----------|
| NodeFsBackend      | ...         | ...           | ...         | disk space    | Node.js only                           | ...      |
| MemoryStorage      | ...         | ...           | ...         | RAM           | All (no persistence)                   | ...      |
| LocalStorageBackend| ...         | ...           | ...         | ~5–10 MB      | All modern browsers                    | ...      |
| AgenticStoreBackend| ...         | ...           | ...         | IndexedDB     | Chrome, Firefox, Safari, Edge          | ...      |
| SQLiteBackend      | ...         | ...           | ...         | disk space    | Node.js (via better-sqlite3)           | ...      |
```

## Change 2: scan() example
Find any code example in README.md that shows `scan()` returning `{ path, content }` without a `line` field and update it to `{ path, line, content }`.

Example fix:
```js
// Before (stale)
const results = await backend.scan('hello')
// results: [{ path: '/file.txt', content: 'hello world' }]

// After (current)
const results = await backend.scan('hello')
// results: [{ path: '/file.txt', line: 1, content: 'hello world' }]
```

## Edge cases
- Do not change the performance numbers themselves — only add missing cells
- Only fix scan() examples that are missing `line`; leave correct examples untouched

## Dependencies
- No code changes; README only

## Test cases to verify (DBB)
- DBB-007: performance table has all four required columns with content for each row
- DBB-008: no scan() example shows `{ path, content }` without `line`
