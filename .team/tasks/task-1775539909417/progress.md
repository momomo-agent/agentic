# Implement file metadata in LsResult

## Progress

Added `stat()` method to `OPFSBackend` in `src/backends/opfs.ts`. Uses `getFileHandle()` + `fh.getFile()` to return `{ size, mtime }`, returns null on error. Follows design spec exactly.
