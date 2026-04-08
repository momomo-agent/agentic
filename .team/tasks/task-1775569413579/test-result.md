# Test Result: Fix SQLiteBackend empty path validation and tree tool name

## Status: PASS

## Verification
- `src/backends/sqlite.ts:36` — `norm('')` throws `IOError('Path cannot be empty')` ✅
- `src/filesystem.ts:322` — tool name is `'file_tree'` (matches DBB-012) ✅
- Fixed outdated test assertions in `test/m6-stat-agent-tools.test.js` (tree → file_tree)
- `npm test`: 368/368 pass (was 367/368)
