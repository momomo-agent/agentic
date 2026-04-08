# Export ShellFS in index.ts

## Progress

### Completed Changes

1. **Updated src/index.ts**
   - Added export for ShellFS class from shell.js
   - Consumers can now import ShellFS directly from the package

### Implementation Details
- ShellFS was already fully implemented in src/shell.ts
- Provides shell command interface (ls, cat, grep, find) over AgenticFileSystem
- Simple one-line export addition

### Verification
- Build succeeded with no TypeScript errors
- ShellFS is now exported in dist/index.d.ts
- Package size increased from 10.66 KB to 12.44 KB (includes ShellFS implementation)
