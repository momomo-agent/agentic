# M5 DBB - Test Hardening & DBB Compliance

## DBB-001: All existing tests pass
- Requirement: task-1775558192784 — 修复 4 个失败测试
- Given: test suite run with `npm test` or `npx vitest`
- Expect: 0 test failures, all 148+ tests pass, exit code 0
- Verify: no skipped tests, no test errors in output

## DBB-002: DBB-017 resolve() test passes
- Requirement: task-1775558192784 — DBB-017 resolve() 更新
- Given: test case for `resolve('../foo')` from `/a/b`
- Expect: returns `/a/foo`, test passes
- Verify: all path normalization edge cases covered (../../, ../.., escape above root)

## DBB-003: rm multi-path boundary test
- Requirement: task-1775558192826 — rm 多路径边界测试
- Given: `rm file1.txt file2.txt file3.txt` where all files exist
- Expect: all files deleted, exit code 0
- Verify: test exists and passes

## DBB-004: rm -r deep nesting boundary test
- Requirement: task-1775558192826 — rm -r 深层嵌套
- Given: directory tree 10+ levels deep with files at each level
- Expect: `rm -r /deep` deletes entire tree, exit code 0
- Verify: test exists and passes, no stack overflow

## DBB-005: grep -i invalid regex boundary test
- Requirement: task-1775558192826 — grep -i 无效正则
- Given: `grep -i "[invalid" file.txt` (unclosed bracket)
- Expect: error message indicating invalid pattern, exit code non-zero
- Verify: test exists and passes

## DBB-006: 3+ stage pipe boundary test
- Requirement: task-1775558192826 — 3+ 阶段管道
- Given: `cat file | grep pattern | grep another | wc`
- Expect: correct output from final stage, exit code 0
- Verify: test exists and passes, intermediate outputs correctly piped

## DBB-007: EXPECTED_DBB.md exists
- Requirement: task-1775558192863 — 创建 EXPECTED_DBB.md
- Given: project root directory
- Expect: EXPECTED_DBB.md file exists at root
- Verify: file is readable, non-empty

## DBB-008: EXPECTED_DBB.md covers all commands
- Requirement: task-1775558192863 — 覆盖所有命令的验收标准
- Given: EXPECTED_DBB.md content
- Expect: document includes acceptance criteria for ls, cat, grep, find, pwd, cd, mkdir, rm, mv, cp, echo, touch, head, tail, wc
- Verify: each command has at least one DBB entry with Given/Expect/Verify format

## DBB-009: EXPECTED_DBB.md includes boundary cases
- Requirement: task-1775558192863 — 边界用例文档
- Given: EXPECTED_DBB.md content
- Expect: document includes boundary cases (empty files, special chars, path resolution, deep nesting, invalid input)
- Verify: at least 5 boundary case DBB entries documented

## DBB-010: EXPECTED_DBB.md defines quality gates
- Requirement: task-1775558192863 — 质量门槛
- Given: EXPECTED_DBB.md content
- Expect: document defines quality gates (test coverage %, performance thresholds, error handling standards)
- Verify: quality gates are measurable and specific
