# Output redirection with error source

## Progress

Fixed `appendMatch` and `writeMatch` branches in `exec()` to check exitCode before writing. If source command fails, return early without writing. All 3 tests pass.
