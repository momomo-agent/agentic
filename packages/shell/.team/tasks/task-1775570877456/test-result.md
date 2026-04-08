# Test Result — Fix cp without -r on directory

## Summary
- Total: 3 tests (in test/m14-review.test.ts)
- Passed: 3
- Failed: 0

## Results
| Test | Status |
|------|--------|
| returns is-a-directory error when src is a dir | ✅ PASS |
| copies file when src is not a directory | ✅ PASS |
| cp -r on directory performs recursive copy | ✅ PASS |

## Implementation verified
`cp` uses `fs.ls()` to detect directories before attempting file read. Returns `cp: <src>: is a directory (use -r)` correctly.

## tester-1 verification (2026-04-07)
Re-ran all 3 tests — all pass. Implementation confirmed at src/index.ts:549.
