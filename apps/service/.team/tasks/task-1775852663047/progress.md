# Fix config-persistence test — ENOENT on atomic rename

## Investigation

The reported ENOENT error on `rename` in `_writeToDisk` (src/config.js:325) has already been fixed.

The current `_writeToDisk` implementation (lines 320-337) includes proper ENOENT retry logic:
1. `fs.mkdir(CONFIG_DIR, { recursive: true })` before writing
2. Try `fs.rename(tmp, CONFIG_PATH)`
3. On ENOENT: re-create directory, re-write tmp, retry rename

## Verification

- `test/config-persistence.test.js`: all 10 tests pass
- Full test suite: 972/972 pass, 0 failures

## Status: Already fixed, no code changes needed.
