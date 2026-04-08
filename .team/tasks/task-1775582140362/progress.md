# Add empty-path validation to OPFSBackend

## Progress

- Added `IOError` import from `../errors.js`
- Added `validatePath()` private method
- Called `validatePath(path)` at top of `get()`, `set()`, `delete()`
