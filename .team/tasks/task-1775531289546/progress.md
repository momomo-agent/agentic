# 统一三个 backend 的 list() 路径格式

## Progress

### Completed Changes

1. **Updated src/backends/agentic-store.ts**
   - Added `normPath()` helper to ensure paths always have leading `/`
   - Applied normalization in `get()`, `set()`, `delete()` to store keys consistently
   - Updated `list()` to normalize all returned keys with leading `/`
   - Updated `scan()` to normalize paths in results
   - Handles both existing keys without `/` and new keys with `/`

2. **Updated src/types.ts**
   - Added JSDoc comment to `StorageBackend.list()` clarifying path contract
   - Documents that all paths must have leading slash (e.g., "/foo/bar.txt")

### Implementation Details
- `normPath()` checks if path starts with `/`, adds it if missing
- `list()` normalizes all keys from store before filtering by prefix
- `scan()` normalizes paths in results to maintain consistency
- Backward compatible: handles keys stored without `/` in existing stores

### Verification
- Build succeeded with no TypeScript errors
- All three backends now return paths with leading `/`
- NodeFsBackend and OPFSBackend already had correct format
