# M1 DBB - Foundation & Quality Gate

## DBB-001: grep -r recursive search
- Requirement: PRD §命令增强 — grep -r recursive search
- Given: a directory tree with files containing a pattern at multiple depths
- Expect: `grep -r <pattern> <dir>` returns all matching lines from all files recursively, exit code 0
- Verify: results include matches from nested subdirectories, not just top-level files

## DBB-002: grep -r no match
- Requirement: PRD §命令增强 — grep -r recursive search
- Given: `grep -r <pattern> <dir>` where no file contains the pattern
- Expect: empty output, exit code 1 (UNIX standard for no match)

## DBB-003: grep -r on non-existent directory
- Requirement: PRD §错误处理
- Given: `grep -r pattern /nonexistent`
- Expect: exit code non-zero, error message contains path and reason (e.g. "No such file or directory")

## DBB-004: pipe — cat file | grep pattern
- Requirement: PRD §命令增强 — pipe support
- Given: a file containing lines with and without a pattern; run `cat <file> | grep <pattern>`
- Expect: output contains only matching lines, exit code 0

## DBB-005: pipe — chained output is correct
- Requirement: PRD §命令增强 — pipe support
- Given: `echo "hello world" | grep hello`
- Expect: output is "hello world", exit code 0

## DBB-006: pipe — left command fails
- Requirement: PRD §错误处理
- Given: `cat /nonexistent | grep pattern`
- Expect: error message from cat propagates, grep does not produce output, exit code non-zero

## DBB-007: error message — file not found (UNIX format)
- Requirement: PRD §错误处理 — 文件不存在时返回标准错误格式
- Given: any command referencing a non-existent file (e.g. `cat /no/such/file`)
- Expect: stderr contains `<command>: <path>: No such file or directory`, exit code non-zero

## DBB-008: error message — directory operation failure
- Requirement: PRD §错误处理 — 目录操作失败时给出清晰提示
- Given: `mkdir` on a path whose parent does not exist (without -p)
- Expect: error message identifies the failing path, exit code non-zero

## DBB-009: error message — rm non-existent path
- Requirement: PRD §错误处理
- Given: `rm /nonexistent`
- Expect: error message contains path, exit code non-zero

## DBB-010: ls -a shows hidden files
- Requirement: PRD §命令增强 — ls -a 显示隐藏文件
- Given: a directory containing `.hidden` and `visible` files
- Expect: `ls -a <dir>` output includes `.hidden`; `ls <dir>` (without -a) does not include `.hidden`

## DBB-011: ls -a includes . and ..
- Requirement: PRD §命令增强 — ls -a 显示隐藏文件
- Given: any directory
- Expect: `ls -a` output includes `.` and `..` entries

## DBB-012: test suite exists and passes
- Requirement: PRD §测试覆盖 — 所有命令有测试覆盖
- Given: test runner invoked (e.g. `npm test` or `npx vitest`)
- Expect: test suite runs without setup errors, all tests pass, exit code 0

## DBB-013: test coverage ≥ 80%
- Requirement: M1 Acceptance Criteria — >80% coverage for all commands
- Given: coverage report generated after running tests
- Expect: overall statement/branch coverage reported as ≥ 80%

## DBB-014: each command has at least one test
- Requirement: PRD §测试覆盖 — 每个命令的单元测试
- Given: test suite
- Expect: ls, cat, grep, find, pwd, cd, mkdir, rm, mv, cp, echo, touch, head, tail, wc each have at least one passing test case

## DBB-015: boundary — empty file
- Requirement: PRD §测试覆盖 — 边界 case（空文件）
- Given: `cat <empty-file>`
- Expect: empty output, exit code 0

## DBB-016: boundary — special characters in filename
- Requirement: PRD §测试覆盖 — 边界 case（特殊字符）
- Given: a file named `hello world.txt` (space in name); run `cat "hello world.txt"`
- Expect: file contents returned correctly, exit code 0

## DBB-017: boundary — path resolution
- Requirement: PRD §测试覆盖 — 边界 case（路径解析）
- Given: `cat ./subdir/../file.txt` where `file.txt` exists at root
- Expect: file contents returned correctly, exit code 0
