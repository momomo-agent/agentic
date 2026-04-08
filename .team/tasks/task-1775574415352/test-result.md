# Test Result: Fix cp without -r on Directory

## Summary
- **Status**: PASSED
- **Tests**: 4 passed, 0 failed

## Test Results

| Test | Result |
|------|--------|
| cp dir dest without -r returns "cp: <path>: is a directory" | ✓ PASS |
| error message does NOT contain "(use -r)" | ✓ PASS |
| cp -r dir dest still works | ✓ PASS |
| cp file (non-dir) still works without -r | ✓ PASS |

## DBB Verification (m17)
- [x] `cp dir/ dest` returns `cp: dir/: is a directory` (no `-r` suffix)
- [x] `cp -r dir/ dest` still works correctly
- [x] Error message matches UNIX format: `cp: <path>: is a directory`

## Implementation
Fix is at `src/index.ts:580` — returns `cp: ${src}: is a directory` without `(use -r)` suffix.

## Edge Cases
- No untested edge cases identified for this fix scope
