# Progress: Enforce toolConfig.code.timeout in executeCode

## Changes Made

### src/tools/code.ts
- Added `withTimeout<T>()` helper function that wraps a Promise with an optional timeout
- Updated `executeCode` signature to accept optional `timeout?: number` parameter
- **JavaScript sync path**: Wrapped `vm.evalCode()` call with `withTimeout()`
- **JavaScript async path**: Wrapped entire async IIFE with `withTimeout()`
- **Python browser path**: Wrapped `executePythonBrowser()` call with `withTimeout()`
- **Python node path**: Added `timeout` parameter to `executePythonNode()`, uses `setTimeout` to kill process with SIGTERM after timeout

### src/ask.ts
- In `handleToolCall`, `code_exec` case now reads `config.toolConfig?.code?.timeout` and passes it to `executeCode()`

## Edge Cases Handled
- `timeout = undefined`: No enforcement (backward compatible)
- `timeout = 0`: Treated as no timeout
- `timeout < 0`: Treated as no timeout
- All timeout errors use consistent format: `Code execution timed out after ${timeout}ms`

## Test Results
- All 174 existing tests pass (32 test files)
- No new tests added (existing tests cover backward compatibility since they don't pass timeout)
