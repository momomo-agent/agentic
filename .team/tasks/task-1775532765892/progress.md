# grep 流式处理大文件

## Progress

## Implementation Complete

Added streaming support to grep command for single file operations in `src/index.ts`:

### Changes Made
1. Added `grepStream()` helper method that:
   - Checks for optional `readStream` interface on filesystem
   - Uses async iteration for memory-efficient line-by-line processing
   - Falls back to `fs.read()` when streaming not available
   - Maintains line numbers and formatting

2. Modified `grep()` method to:
   - Detect single non-recursive file path operations
   - Delegate to `grepStream()` for single files
   - Keep existing `fs.grep()` for recursive and multi-path operations
   - Handle errors with proper UNIX error formatting

### Implementation Details
- Streaming only activates for: `grep pattern /single-file`
- Recursive (`-r`) and multi-path operations use existing `fs.grep()`
- Graceful fallback when `readStream` not available
- All flags (`-c`, `-l`) work correctly with streaming
- Line numbers preserved in output format

### Test Coverage
Created `test/grep-streaming.test.ts` with 8 test cases:
- ✓ Uses readStream when available
- ✓ Falls back to read when readStream absent
- ✓ grep -c returns count with streaming
- ✓ grep -l returns filename with streaming
- ✓ No matches returns empty string
- ✓ File errors return proper error messages
- ✓ grep -r still uses fs.grep (not streaming)
- ✓ Multiple paths use fs.grep (not streaming)

All 8 streaming tests passing.

## Files Modified
- `src/index.ts` - grep() method and new grepStream() helper (lines 138-197)

## Files Created
- `test/grep-streaming.test.ts` - 8 test cases
