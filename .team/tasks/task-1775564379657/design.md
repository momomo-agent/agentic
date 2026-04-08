# Design: Implement stat() on OPFSBackend and AgenticStoreBackend

## Status
Already implemented. This design documents the existing implementation.

## Files Modified
- `src/backends/opfs.ts` — `stat()` at line 96
- `src/backends/agentic-store.ts` — `stat()` at line 67

## Implementation

### OPFSBackend.stat(path: string): Promise<{ size: number; mtime: number } | null>
- Gets file handle via `getFileHandle(path)`
- Calls `fh.getFile()` to get a `File` object
- Returns `{ size: file.size, mtime: file.lastModified }`
- Returns `null` on any error (file not found, etc.)

### AgenticStoreBackend.stat(path: string): Promise<{ size: number; mtime: number } | null>
- Calls `this.store.get(normPath(path))`
- Returns `null` if value is null/undefined
- Returns `{ size: new Blob([String(value)]).size, mtime: Date.now() }`
- Note: `mtime` is approximate (current time) since agentic-store has no timestamp tracking
- Returns `null` on error

## Edge Cases
- Missing file → returns `null` (not an error throw)
- `mtime` on AgenticStoreBackend is always `Date.now()` — no persistent timestamp available

## Test Cases
- `stat('/existing')` → `{ size: N, mtime: N }`
- `stat('/missing')` → `null`
