# Test Result: Fix grep -i with -l/-c in multi-file mode (task-1775580789278)

## Summary
- Total tests: 7 (4 direct + 3 related)
- Passed: 7
- Failed: 0
- Status: PASS

## Test Results (4/4 passed)
From `test/grep-i-multifile-m20.test.ts`:
| Test | Status |
|------|--------|
| grep -i passes pattern (not empty string) to fs.grep | PASS |
| grep -i -l returns filenames with case-insensitive matches | PASS |
| grep -i -c returns correct count across multiple files | PASS |
| grep -i -r searches recursively case-insensitively | PASS |

## Related Tests (3/3 passed)
From `test/grep-i-nonstreaming-m16.test.ts`:
| Test | Status |
|------|--------|
| grep -i -r matches case-insensitively via fs.grep path | PASS |
| grep -i -r -c counts case-insensitive matches | PASS |
| grep -i -r no match returns empty | PASS |

## DBB Verification (m20)
- [x] `grep -i` passes pattern to `fs.grep` (not empty string) — verified at line 446
- [x] `grep -i -l` correctly filters by case-insensitive match
- [x] `grep -i -c` returns correct match count
- [x] `grep -i -r` works for recursive case-insensitive search
