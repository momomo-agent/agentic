# mv 目录支持

## Progress

### Implementation Complete ✓

Modified `src/index.ts` mv() method (lines 359-395) to support directory moves.

**Changes Made:**
1. Added directory detection using `fs.ls()` try/catch
2. For directories: call `copyRecursive()` then `rmRecursive()`
3. For files: kept existing read/write/delete logic
4. Reused existing helpers:
   - `copyRecursive()` from cp -r implementation
   - `rmRecursive()` from rm -r implementation

**Algorithm:**
1. Parse src and dst from args
2. Resolve paths and check write permissions
3. Try `fs.ls(srcPath)` to detect if directory
4. If directory: copy recursively then delete recursively
5. If file: use existing file move logic
6. Return empty string on success, error message on failure

**Edge Cases Handled:**
- Source doesn't exist → fsError returns "No such file or directory"
- readOnly filesystem → checkWritable catches it before operation
- Root directory protection → rmRecursive already refuses to delete '/'

### Tests Created

Created `test/mv-directory.test.ts` with 4 test cases:
1. ✓ File moves (existing behavior preserved)
2. ✓ Directory moves
3. ✓ Missing operand error handling
4. ✓ Non-existent source error handling

All tests pass.

