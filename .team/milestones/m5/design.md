# M5 Technical Design: Test Coverage & Integration Verification

## Overview
Two tasks: fix the 1 failing async code test, then add a systemPrompt multi-round test.

## Task Breakdown

### Task 1: Fix failing test (task-1775529644164)
- **Failing test**: `DBB-010` in `test/code-tool.test.ts` — `await Promise.resolve(42)` returns error `"expecting ';'"`
- **Root cause**: `quickjs-emscripten` `vm.evalCode()` does not support top-level `await`. The code string must be wrapped in an async IIFE and evaluated via `vm.evalCodeAsync()` (or equivalent).
- **Fix location**: `src/tools/code.ts` — `executeCode()`
- **Approach**: Detect `await` at top level (or always wrap) and use `QuickJS.newAsyncContext()` + `vm.evalCodeAsync()`.

### Task 2: systemPrompt multi-round test (task-1775529723367)
- **New test file**: `test/ask-system-prompt-multiround.test.ts`
- **Test**: Mock provider returns `tool_use` twice then `end`. Assert `chat` is called 3 times, each call receives `systemPrompt` as 3rd arg.
- **No source changes needed** — `ask.ts` already passes `config.systemPrompt` on every `provider.chat()` call.

## Dependencies
- `quickjs-emscripten` async API (already installed)
- No new packages needed
