# Fix SQLiteBackend empty path validation and tree tool name

## Progress

1. `src/backends/sqlite.ts`: added `if (path === '') throw new IOError('Path cannot be empty')` in `norm()`
2. `src/filesystem.ts`: renamed `'tree'` → `'file_tree'` in tool definition name and case statement
3. TypeScript build passes with no errors
