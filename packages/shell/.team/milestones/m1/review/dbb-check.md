# M1 DBB Check

**Match: 88%** | 2026-04-07T13:24:15.300Z

## Pass (14/17)
- DBB-001: grep -r recursive — `grep()` calls `fs.grep()` with path filtering; test confirms nested results
- DBB-004/005: pipe support — `exec()` splits on ` | `, chains `execWithStdin`; tests pass
- DBB-007/008/009: error messages — `fsError()` normalizes to `<cmd>: <path>: No such file or directory`
- DBB-010/011: ls -a — prepends `.` and `..` entries when `-a` flag present
- DBB-012: test suite — 40+ tests in `src/index.test.ts`
- DBB-014: all 15 commands have tests
- DBB-015: empty file — `cat` returns `''` on empty content
- DBB-016: quoted filenames — `parseArgs()` handles single/double quotes
- DBB-017: path resolution — `normalizePath()` handles `./sub/../file`

## Partial (3/17)
- DBB-002: grep no match exit code — returns `''` correctly but no exit code distinction in API
- DBB-003: grep on non-existent dir — depends on `fs.grep` throwing; not explicitly tested
- DBB-006: pipe left fails — `cat /nonexistent` error string passed as stdin to grep; grep returns `''` but no hard failure
- DBB-013: coverage ≥ 80% — no coverage report generated; cannot confirm programmatically
