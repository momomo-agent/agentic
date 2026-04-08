# Fix scan() return type inconsistency

## Progress

### Completed Changes

1. **Updated StorageBackend interface (src/types.ts)**
   - Changed scan() return type from `{path, content}[]` to `{path, line, content}[]`
   - Now matches NodeFsBackend and OPFSBackend implementations

2. **Fixed AgenticStoreBackend.scan() (src/backends/agentic-store.ts)**
   - Replaced file-level matching with line-level matching
   - Splits content by newlines and returns individual lines with line numbers
   - Skips non-string values with `typeof value !== 'string'` check
   - Line numbers are 1-indexed (i + 1)

3. **Simplified literalGrep() (src/filesystem.ts)**
   - Removed redundant line splitting logic
   - Directly maps scan() results to GrepResult format
   - Much cleaner since scan() already provides line-level results

### Verification
- Build succeeded with no TypeScript errors
- All three backends now have consistent scan() signatures

### Edge Cases Handled
- Non-string values in store: skipped
- Empty files: produce no results
- Multi-line matches: each line emitted separately with correct line number
