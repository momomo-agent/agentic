# M3 DBB - Pagination & Streaming

## DBB-001: ls paginates large directory
- Requirement: PRD §性能优化 — ls 大目录时分页
- Given: directory with >pageSize entries; run `ls --page 1 --page-size 10 <dir>`
- Expect: exactly 10 entries returned, exit code 0

## DBB-002: ls page 2 returns next slice
- Requirement: PRD §性能优化
- Given: directory with 25 entries; run `ls --page 2 --page-size 10 <dir>`
- Expect: entries 11–20 returned

## DBB-003: ls last page returns remainder
- Given: 25 entries; `ls --page 3 --page-size 10 <dir>`
- Expect: 5 entries (21–25)

## DBB-004: ls without pagination is backward-compatible
- Given: `ls <dir>` with no pagination flags
- Expect: all entries returned, same as pre-M3

## DBB-005: grep streaming returns correct matches
- Requirement: PRD §性能优化 — grep 大文件时流式处理
- Given: file with known matching lines; grep via streaming interface
- Expect: all matching lines returned, identical to non-streaming output

## DBB-006: grep streaming — no match returns empty
- Given: streaming grep with non-matching pattern
- Expect: empty output

## DBB-007: both features have unit tests
- Requirement: M3 Acceptance Criteria
- Expect: tests for ls pagination and grep streaming exist and pass
