# Populate file metadata in LsResult

## Progress

### Completed Changes

1. **Updated src/types.ts**
   - Added `mtime?: number` field to LsResult interface (epoch milliseconds)
   - Added optional `stat?(path: string)` method to StorageBackend interface
   - Returns `{ size: number; mtime: number } | null`

2. **Implemented stat() in src/backends/node-fs.ts**
   - Added `stat` import from 'node:fs/promises'
   - Implemented stat() method that returns file size and modification time
   - Returns null on error (file not found, permission denied, etc.)
   - Uses `s.mtimeMs` for millisecond precision

3. **Updated src/filesystem.ts ls() method**
   - Calls `this.storage.stat?.(p)` for file entries (not directories)
   - Uses optional chaining since stat() is optional on StorageBackend
   - Populates size and mtime fields in LsResult when available
   - Gracefully handles backends without stat() implementation

### Implementation Details
- stat() is optional - only NodeFsBackend implements it
- AgenticStoreBackend and OPFSBackend don't implement stat() - their ls() results have undefined size/mtime
- Only file entries get stat() called, not directory entries
- Failures in stat() return null, resulting in undefined size/mtime (no crash)

### Verification
- Build succeeded with no TypeScript errors
- NodeFsBackend now provides file metadata
- Other backends continue to work without stat() implementation
