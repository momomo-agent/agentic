# Milestone 18: DBB Compliance & Test Coverage Gaps

## Goals
- Fix wc tab-separated output format (DBB-wc-001)
- Fix exit code 127 vs 2 for unknown commands (DBB-m15)
- Add missing test coverage for ls pagination, find -type, rm -r safety, cd-to-file
- Fix mkdir error message format (UNIX standard)

## Acceptance Criteria
- wc output uses tabs: `2\t3\t10\t/file`
- Unknown command returns exitCode 2
- Tests cover: ls --page, find -type f/d, rm -r refusing root, cd to file
- mkdir without -p: error is `mkdir: X: No such file or directory`
