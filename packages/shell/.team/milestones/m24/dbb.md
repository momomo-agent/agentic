# DBB — m24: PRD Test Coverage & Error Format Fixes

## Overview
Verification criteria for closing PRD compliance gaps: adding test coverage for implemented-but-untested features and fixing mkdir error message format. Target: raise PRD match from ~75% toward ≥90%.

## DBB Criteria

### ls Pagination Test Coverage (DBB-m24-ls-page)

**DBB-m24-ls-page-001**: Page 1 vs page 2 returns different entries
- Given: directory with 7 entries
- When: `ls --page 1 --page-size 3 /dir` then `ls --page 2 --page-size 3 /dir`
- Expect: page 1 returns entries 1-3, page 2 returns entries 4-6, no overlap
- Test file: `test/ls-pagination.test.ts`

**DBB-m24-ls-page-002**: page-size controls items per page
- Given: directory with 7 entries
- When: `ls --page 1 --page-size 2 /dir`
- Expect: exactly 2 entries returned

**DBB-m24-ls-page-003**: Out-of-range page returns empty
- Given: directory with 7 entries
- When: `ls --page 99 --page-size 3 /dir`
- Expect: empty string output

**DBB-m24-ls-page-004**: Pagination with -l flag preserves long format
- Given: directory with entries
- When: `ls -l --page 1 --page-size 2 /dir`
- Expect: 2 entries in long format with permissions column

**DBB-m24-ls-page-005**: Default page size is 20 when --page given without --page-size
- Given: directory with fewer than 20 entries
- When: `ls --page 1 /dir`
- Expect: all entries returned

### find -type Test Coverage (DBB-m24-find-type)

**DBB-m24-find-type-001**: find -type f returns only files recursively
- Given: directory tree with files and subdirectories
- When: `find /project -type f`
- Expect: only file paths returned, no directory paths

**DBB-m24-find-type-002**: find -type d returns only directories recursively
- Given: directory tree with files and subdirectories
- When: `find /project -type d`
- Expect: only directory paths returned, no file paths

**DBB-m24-find-type-003**: find -type f -name combined filter
- Given: directory with mixed file types
- When: `find /dir -type f -name "*.ts"`
- Expect: only `.ts` files, directories excluded

### rm -r Root Safety Test (DBB-m24-rm-root)

**DBB-m24-rm-root-001**: rm -r / returns error and does not delete
- Given: filesystem root `/`
- When: `rm -r /`
- Expect: output is `rm: refusing to remove '/'`, `fs.delete` never called
- Also verify: exitCode is 1

### cd-to-File Boundary Test (DBB-m24-cd-file)

**DBB-m24-cd-file-001**: cd to file returns "Not a directory"
- Given: `/file.txt` exists as a file
- When: `cd /file.txt`
- Expect: output contains `Not a directory`, cwd unchanged, exitCode is 1

### Path Resolution Unit Tests (DBB-m24-resolve)

**DBB-m24-resolve-001**: `..` does not escape root boundary
- Given: path `../../foo` from root
- When: `normalizePath` called
- Expect: `/foo`

**DBB-m24-resolve-002**: Multiple `../` chains resolve correctly
- Given: cwd `/a/b/c/d`, resolve `../../../x`
- Expect: `/a/x`

**DBB-m24-resolve-003**: Absolute vs relative path distinction
- Given: cwd `/a/b`
- When: resolve `/absolute/path` → `/absolute/path`; resolve `relative` → `/a/b/relative`

**DBB-m24-resolve-004**: Trailing slashes normalized
- Given: path `/a/b/c/`
- When: `normalizePath` called
- Expect: `/a/b/c`

**DBB-m24-resolve-005**: Dot segments `.` are removed
- Given: path `./foo/./bar`
- When: `normalizePath` called
- Expect: `/foo/bar`

### mkdir Error Format Fix (DBB-m24-mkdir)

**DBB-m24-mkdir-001**: mkdir parent-missing error uses UNIX format
- Given: parent `/a/b` does not exist
- When: `mkdir /a/b/c`
- Expect: `mkdir: /a/b/c: No such file or directory`
- NOT: `mkdir: cannot create directory '/a/b/c': ...`

**DBB-m24-mkdir-002**: mkdir -p still works (no regression)
- Given: parent does not exist
- When: `mkdir -p /a/b/c`
- Expect: success, all dirs created

**DBB-m24-mkdir-003**: mkdir on readOnly fs returns permission error
- Given: `fs.readOnly === true`
- When: `mkdir /newdir`
- Expect: `mkdir: /newdir: Permission denied`

## Verification Method
- Run `npm test` and confirm all tests pass
- Each DBB criterion maps to at least one test assertion
- mkdir error format verified by checking assertion strings in test output
