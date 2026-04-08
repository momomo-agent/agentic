# 边界用例测试覆盖

## Status: Complete

## Changes
- src/index.ts: try-catch around new RegExp() in execWithStdin, grep, grepStream
- src/index.test.ts: 5 new boundary tests (rm multi-path, rm -r deep nesting, grep -i invalid regex, 3-stage pipe, empty intermediate pipe)

## Notes
- All 5 new tests pass individually
- Pre-existing OOM in src/index.test.ts when running all 51 tests together (not caused by these changes)

