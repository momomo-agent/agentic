# Design: 边缘用例测试覆盖

## Files
`test/edge-cases.test.js` (or extend existing test files)

## Test Cases to Add
1. **工具调用空参数**: brain.js tool call with `{}` → no crash, returns error message
2. **并发写**: 10 parallel `memory.add()` → all entries retrievable
3. **SIGINT**: send SIGINT to running server → process exits cleanly (code 0 or 130)
4. **npx e2e**: `npx agentic-service --dry-run` → exits 0 without starting server
5. **store DB 失败**: mock store to throw → memory.add/search return graceful error

## Coverage Target
≥ 98% (lines + branches)

## Approach
- Use existing test runner (check package.json for test script)
- Mock `agentic-store` for DB failure scenario
- Use `child_process.spawn` for SIGINT and npx e2e tests
