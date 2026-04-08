# DBB — m26: PRD Bug Fixes & Performance Gates

## Overview
Verification criteria for fixing PRD compliance bugs and adding performance benchmarks. Target: push PRD match toward ≥90%.

## DBB Criteria

### grep -i Consistency (DBB-m26-grep-i)

**DBB-m26-grep-i-001**: grep -i in multi-file path matches case-insensitively
- Given: `/a.txt` contains "Hello", `/b.txt` contains "world"
- When: `grep -i hello /a.txt /b.txt`
- Expect: output contains `/a.txt:1: Hello`

**DBB-m26-grep-i-002**: grep -i with -l in multi-file path returns correct files
- Given: `/a.txt` contains "Hello", `/b.txt` contains "world"
- When: `grep -il hello /a.txt /b.txt`
- Expect: output is `/a.txt` (only file with match)

**DBB-m26-grep-i-003**: grep -i with -c in multi-file path returns correct count
- Given: `/a.txt` contains "Hello\nhello\nworld"
- When: `grep -ic hello /a.txt`
- Expect: output is `2`

**DBB-m26-grep-i-004**: grep -i in recursive path matches case-insensitively
- Given: `/src/a.txt` contains "Hello", `/other/b.txt` contains "hello"
- When: `grep -ir hello /src`
- Expect: output contains match from `/src/a.txt` only

**DBB-m26-grep-i-005**: grep -i with -l in recursive path returns correct files
- Given: `/src/a.txt` contains "Hello", `/src/b.txt` contains "world"
- When: `grep -ilr hello /src`
- Expect: output is `/src/a.txt`

**DBB-m26-grep-i-006**: grep -i with -c in recursive path returns correct count
- Given: `/src/a.txt` contains "Hello\nHELLO"
- When: `grep -icr hello /src`
- Expect: output is `2`

### rm -r Deep Nesting (DBB-m26-rm-deep)

**DBB-m26-rm-deep-001**: rm -r handles 20+ level directory tree
- Given: directory tree `/deep/l1/l2/.../l20/file.txt` (20 levels)
- When: `rm -r /deep`
- Expect: all files and directories deleted, no stack overflow, exitCode 0

**DBB-m26-rm-deep-002**: rm -r handles wide directory (many siblings)
- Given: `/wide/` with 100 files and 50 subdirectories
- When: `rm -r /wide`
- Expect: all entries deleted, exitCode 0

**DBB-m26-rm-deep-003**: rm -r handles cycle via visited set
- Given: filesystem with symlink-like cycle (visited set prevents infinite loop)
- When: `rm -r /a`
- Expect: terminates without infinite loop

### Performance Benchmarks (DBB-m26-perf)

**DBB-m26-perf-001**: grep completes within 500ms on 1MB file
- Given: file with 1MB content (~20K lines)
- When: `grep pattern /bigfile`
- Expect: completes in <500ms

**DBB-m26-perf-002**: find completes within 1s on 1000 files
- Given: directory tree with 1000 files
- When: `find /bigdir`
- Expect: completes in <1000ms

**DBB-m26-perf-003**: ls with pagination completes within 100ms
- Given: directory with 500 entries
- When: `ls --page 1 --page-size 20 /bigdir`
- Expect: completes in <100ms

## Verification Method
- Run `npm test` and confirm all tests pass
- Each DBB criterion maps to at least one test assertion
- Performance tests use `performance.now()` timing with generous thresholds
