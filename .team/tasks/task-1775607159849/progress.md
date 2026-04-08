# Fix grep streaming for large files consistency

## Progress

### Changes Made

#### src/index.ts
- Added multi-file streaming path (lines 573-588): When `readStream` is available and grep is non-recursive with multiple file paths, uses `grepStream()` for each file instead of falling through to `fs.grep()`.
- Filters out `grep: warning:` messages from individual stream results
- Handles errors per-file with `fsError()` fallback

#### src/index.test.ts
- Added `grep streaming` describe block with 10 tests:
  - Single file streaming (basic match)
  - `-i` flag with streaming (case-insensitive)
  - `-c` flag with streaming (count)
  - `-l` flag with streaming (filenames)
  - Multiple files streaming (basic)
  - `-c` with multiple files streaming
  - `-l` with multiple files streaming
  - Fallback to `read()` when `readStream` unavailable
  - Non-existent file in multi-file streaming
  - Empty results for no matches in multi-file streaming

#### test/grep-streaming.test.ts
- Updated existing test "grep with multiple paths uses fs.grep" -> "grep with multiple paths uses streaming when readStream available"
- The old test expected `fs.grep()` to be called; now verifies that `readStream` is called instead

### Verification
- All 459 tests pass (61 test files)
- No regressions in existing grep tests
