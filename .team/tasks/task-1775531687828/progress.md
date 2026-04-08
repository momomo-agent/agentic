# 标准化错误处理

## Progress

- Added `fsError()` helper: normalizes "not found"/"no such" errors to UNIX format
- Updated cat, mv, cp, head, tail, wc to use `fsError()`
- Added error check to `rm`: reads path first, returns standard error if missing
- Added try/catch to `mkdir`: returns standard error on write failure
