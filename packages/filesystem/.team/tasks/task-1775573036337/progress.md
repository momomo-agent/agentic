# Add delete and tree agent tool definitions

## Progress

- Added `rm` and `tree` cases to `exec()` in `src/shell.ts`
- `rm`: returns error if no path, calls `fs.delete()`, returns ''
- `tree`: calls `fs.tree()` for recursive TreeNode[], renders indented string
- TypeScript compiles clean
