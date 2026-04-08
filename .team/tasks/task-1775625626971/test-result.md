# Test Results — Browser verification + ask.ts slimming

**Task**: task-1775625626971
**Tester**: tester
**Date**: 2026-04-08

## Summary

**BLOCKED — Implementation has a critical bug.**

The refactored `src/ask.ts` uses `agenticAsk` from `agentic-core` but fails to pass the required `emit` callback, causing ALL `ask()` and `askStream()` calls to throw `TypeError: emit is not a function`.

## Test Results

### Browser Verification Tests (test/browser-verification.test.ts)

| Test | Status | Notes |
|------|--------|-------|
| isNodeEnv() returns false when process is undefined | PASS | |
| Shell tool excluded in browser — executeShell returns browser error | PASS | |
| Default filesystem is MemoryStorage — ask() does not throw | **FAIL** | `emit is not a function` |
| code_exec tool is registered and offered to provider in browser mode | **FAIL** | `emit is not a function` |
| ask() works in browser with mock provider | **FAIL** | `emit is not a function` |
| askStream() works in browser with mock provider | **FAIL** | `emit is not a function` (crashes worker) |

**Result: 2 passed, 4 failed (33% pass rate)**

### Full Test Suite Impact

| Metric | Before (HEAD) | After (working tree) |
|--------|---------------|---------------------|
| Test Files | 24 passed / 15 failed | 23 passed / 15 failed |
| Tests | 207 passed / 55 failed | 206 passed / 55 failed |

The working tree introduces 1 additional failing test (the `askStream` browser test that crashes the vitest worker).

**Note**: 55 test failures exist in BOTH the committed HEAD and the working tree. The root cause is the same: `agentic-core`'s `agenticAsk()` function calls `emit('status', ...)` at line 354 without checking if `emit` is defined. The `ask()` function in `src/ask.ts:48` calls `agenticAsk()` without passing an `emit` callback.

## Bugs Found

### BUG-1: `emit` callback not passed to `agenticAsk` in `ask()` (CRITICAL)

**File**: `src/ask.ts:48`
**Impact**: Every `ask()` call throws `TypeError: emit is not a function`

The `ask()` function calls:
```typescript
const result = await agenticAsk(prompt, {
  provider: config.provider ?? 'anthropic', apiKey: config.apiKey, ...
  tools: wrappedTools, stream: false,
})
```

But `agentic-core`'s `_agenticAsk` calls `emit('status', { message: ... })` at line 354 unconditionally. No `emit` parameter is passed from `ask()`.

**Fix**: Pass a no-op emit callback: `agenticAsk(prompt, config, () => {})`

### BUG-2: `emit` callback not passed to `agenticAsk` in `askStream()` (CRITICAL)

**File**: `src/ask.ts:65`
**Impact**: `askStream()` crashes the vitest worker (unhandled exception)

The `askStream()` function does pass `emit` but the worker crashes due to the unhandled `process is not defined` error when `globalThis.process` is deleted (browser simulation). The `emit` callback in `askStream()` works correctly in non-browser mode.

### BUG-3: Search tool removed from `buildTools()` (REGRESSION)

**File**: `src/ask.ts:17-39`
**Impact**: Search functionality is no longer available. The `searchToolDef` and `executeSearch` imports are removed.

The old `buildTools()` included search support:
```typescript
import { searchToolDef, executeSearch } from './tools/search.js'
// ...
if (enabled.includes('search')) { tools.push({...searchToolDef, ...}) }
```

The new version completely removes this. Design doc (design.md) does not list search as a goal for this task, so this may be intentional — but it removes functionality that existing tests depend on.

### BUG-4: `AgenticResult.images` field no longer returned (REGRESSION)

**File**: `src/ask.ts:54-57`
**Impact**: `result.images` is always undefined

The old code accumulated images from search results and returned them in `AgenticResult.images`. The new code doesn't include `images` in the return value:
```typescript
return { answer: result.answer, toolCalls: ..., usage: ... }
// Missing: images
```

## Edge Cases Identified

1. **No-op emit for non-streaming**: `ask()` needs `emit: () => {}` for non-streaming mode
2. **Worker crash in browser simulation**: When `process` is deleted, agentic-core's error handling crashes the vitest worker — consider wrapping agenticAsk in try/catch
3. **Tool call tracking**: The new code wraps tools to track `toolCalls` via closure, which is correct but should be tested with multi-round tool execution

## Design Verification

| Design Criterion | Status | Notes |
|-----------------|--------|-------|
| setupAgent() helper extracted | N/A | Developer chose different architecture (uses agenticAsk directly) |
| ask() simplified | PASS | Reduced from ~45 to ~12 lines |
| askStream() simplified | PASS | Reduced from ~40 to ~14 lines |
| Line count decreased | PASS | 152 → 79 lines |
| Backward compatible API | FAIL | `images` field lost, search removed |
| Browser verification tests | FAIL | 4 of 6 tests fail |
| All existing tests pass | FAIL | 55 tests fail (same root cause) |
