# Fix OPFSBackend.stat() isDirectory detection

## Progress

- Added `getDirHandle()` helper to OPFSBackend
- Updated `stat()` to detect directories via TypeMismatchError fallback
- Build passes
