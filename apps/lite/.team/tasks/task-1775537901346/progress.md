# 修复 Python filesystem 注入的 3 个 bug

## Progress

### Summary
Successfully fixed all 3 bugs in Python filesystem injection for Node.js environment.

### Changes Made

#### 1. Fixed Bug #1 - Python reads returning empty string
- Added `buildFileMap()` helper function to extract file paths from Python code using regex
- Pre-fetch file contents from filesystem before spawning Python process
- Pass file map via stdin as JSON to Python process
- Updated Python preamble to read from stdin and populate `_fs_data` dict

#### 2. Fixed Bug #2 - Writes not applied to filesystem
- Added explicit `_fs.flush()` call at end of user code (epilogue)
- Parse `__FS_WRITES__` marker from stdout in close handler
- Apply all writes to filesystem using async filesystem.write()
- Strip `__FS_WRITES__` marker from output before returning

#### 3. Fixed Bug #3 - Relative path support
- Updated Python preamble to check for both `/` and `./` prefixes
- `buildFileMap()` normalizes relative paths by trying both `./foo` and `/foo`
- Python read function checks both path variants

#### 4. Fixed Python name mangling issues
- Changed all double-underscore prefixes to single underscores to avoid Python name mangling
- `__fs_data` → `_fs_data`, `__FS` → `_FS`, `__fs` → `_fs`, `__sys` → `_sys`, `__json` → `_json`

#### 5. Fixed language detection
- Added `with\s+open` pattern to Python detection regex
- Ensures `with open(...)` statements are correctly identified as Python

### Files Modified
- `src/tools/code.ts` - Added `buildFileMap()`, updated `executePythonNode()`, fixed preamble
- `test/code-python-fs.test.ts` - Removed all `.fails()` markers

### Test Results
All 6 Python filesystem tests now pass:
- ✓ open(path, "r") reads from virtual filesystem
- ✓ open(path, "w") writes to virtual filesystem
- ✓ open() throws FileNotFoundError for missing file
- ✓ Python code without filesystem works normally
- ✓ Python with relative path ./file
- ✓ Python write multiple lines

Full test suite: 58/58 tests passing
