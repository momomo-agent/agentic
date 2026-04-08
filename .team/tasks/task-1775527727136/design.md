# Task Design: 添加 code_exec 沙箱测试覆盖

## Task
Write tests for the upgraded quickjs-emscripten sandbox in `src/tools/code.ts`.

## File to Modify

- `test/code-tool.test.ts` — extend existing test file with QuickJS-specific cases

## Test Cases to Add

| # | Input | Expected |
|---|---|---|
| 1 | `{ code: '1 + 1' }` | `output` contains `→ 2`, no `error` |
| 2 | `{ code: 'console.log("hi"); 5' }` | `output` contains `hi` and `→ 5` |
| 3 | `{ code: 'throw new Error("boom")' }` | `error` matches `/boom/` |
| 4 | `{ code: '' }` | `error === 'No code provided'` |
| 5 | `{ code: 'console.warn("w"); console.error("e")' }` | `output` contains `w` and `e` |

## Implementation Notes

- All tests use `executeCode` from `../src/tools/code.js` (existing import)
- Group under `describe('QuickJS sandbox')` to distinguish from existing tests
- No mocking needed — tests run against real implementation
- Tests must pass in Node.js (vitest)

## Dependencies

- `quickjs-emscripten` must be installed (task-1775527461751 prerequisite)
- `blockedBy: ["task-1775527461751"]` should be set if not already
