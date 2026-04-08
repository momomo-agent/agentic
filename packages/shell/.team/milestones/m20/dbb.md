# m20 — Done-By-Definition (DBB)

## DBB-001: grep -i consistency in multi-file mode
- `grep -i pattern file1 file2` returns case-insensitive matches from both files
- `grep -i -l pattern file1 file2` returns filenames with case-insensitive matches
- `grep -i -c pattern file1 file2` returns correct count of case-insensitive matches
- `grep -i -r pattern dir/` returns case-insensitive matches recursively
- `fs.grep()` is called with the actual pattern (not empty string) when `-i` is used

## DBB-002: Path resolution edge cases
- `normalizePath('/a/b/../c')` returns `/a/c`
- `normalizePath('/a/b/../../..')` returns `/` (root escape prevention)
- `resolve('../foo')` from cwd `/a/b` returns `/a/foo`
- `resolve('../../foo')` from cwd `/a/b/c` returns `/a/foo`
- `resolve('.')` returns current cwd unchanged

## DBB-003: Performance gates
- `grep pattern` on a 1MB file completes in < 500ms
- `find /` on 1000 files completes in < 1000ms
- `ls --page 1 --page-size 20` on 1000-entry dir completes in < 100ms

## DBB-004: Coverage gate enforced
- `vitest.config.ts` has `thresholds: { statements: 80, branches: 75 }`
- Total test count >= 148
- `vitest --coverage` fails CI if thresholds not met
- Coverage excludes test files themselves
