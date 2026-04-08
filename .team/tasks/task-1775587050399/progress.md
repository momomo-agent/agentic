# Fix mkdir error format to UNIX standard

## Progress

### Changes Made

**src/index.ts (line 710-715)**
- Changed `mkdir` error message from non-standard `mkdir: cannot create directory '${p}': ${e.message}` to UNIX standard format
- Added edge case handling: checks if error message contains "exist" to distinguish "File exists" vs "No such file or directory"
- Before: `mkdir: cannot create directory '/a/b/c': No such file or directory`
- After: `mkdir: /a/b/c: No such file or directory`

**test/mkdir-find-cd.test.ts (lines 106-118)**
- Updated existing test to use exact `toBe()` assertion instead of loose `toMatch()`/`toContain()`
- Added second test verifying the old non-standard format is not present
- Note: this test file is excluded from vitest config; verification done via dbb.test.ts DBB-008

### Verification
- `npx vitest run test/dbb.test.ts -t "mkdir"` — passes
- `npm test` — 400/403 tests pass (3 pre-existing failures in glob-recursive.test.ts, unrelated)

### Notes
- Used the edge case version from design (distinguishes "File exists" vs "No such file or directory") for correctness
- The existing DBB-008 test in dbb.test.ts passes with the new format
