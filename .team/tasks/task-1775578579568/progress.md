# Fix pipe error propagation

## Changes Made

### src/index.ts
- **Pipe loop fix** (~line 144-152): Replaced early `return { output, exitCode }` with `output = ''` so subsequent pipe segments receive empty stdin when the first command errors
- **Added `execSingleWithError` method**: New method that returns `{ output, hadError }` to reliably detect real errors vs false positives from `isErrorOutput`. Specifically handles `cat` (checks fs.read error), `echo` (never errors), and `pwd` (never errors) with precise logic. Falls back to `isErrorOutput` heuristic for other commands.

### test/pipe-error-edge-cases.test.ts
- Updated 2 tests that expected old behavior (error propagation through pipes) to match new design (empty stdin passthrough):
  - "should handle multi-line error output" → now expects `''` output with non-zero exit code
  - "should propagate error from first command in 3-stage pipe" → renamed to "should pass empty stdin through 3-stage pipe when left side errors", expects `''` output with non-zero exit code

## Test Results
- All 9 pipe-related tests pass (3 in pipe-error-propagation + 6 in pipe-error-edge-cases)
- Full suite: 323/329 pass. 6 failures are pre-existing and unrelated (cp -r error message format, wc filename output format).

## Design Spec Compliance
- `cat /nonexistent | grep foo` → output `''`, exitCode 1 ✓
- `cat /nonexistent | grep foo | wc -l` → output `'0'`, exitCode ≠ 0 ✓
- `echo "foo: bar: baz" | grep foo` → output contains `foo` ✓ (no false positive)
