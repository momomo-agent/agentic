# Task Design: Fix failing test (DBB-010)

## Problem
`test/code-tool.test.ts` DBB-010 fails: `await Promise.resolve(42)` in `executeCode()` returns error `"expecting ';'"` because `quickjs-emscripten` `vm.evalCode()` does not support top-level `await`.

## Fix

**File**: `src/tools/code.ts`

### Change: use async context when code contains `await`

```ts
export async function executeCode(input: Record<string, unknown>): Promise<CodeResult>
```

Logic change in body:
1. If `code` contains `await`, use `QuickJS.newAsyncContext()` and `vm.evalCodeAsync()` (returns a `Promise<VmCallResult>`).
2. Otherwise keep existing sync path with `vm.evalCode()`.

### Pseudocode
```
const hasAwait = /\bawait\b/.test(code)
if (hasAwait):
  const vm = QuickJS.newAsyncContext()
  // inject console (same as now)
  const result = await vm.evalCodeAsync(code)
  // handle error/value same as now
else:
  // existing sync path unchanged
```

## Edge Cases
- Code with `await` in a string literal (e.g. `"await"`) — regex is acceptable; false positives just use async path which is safe.
- `evalCodeAsync` not available on older quickjs-emscripten versions — verify API exists (it does in v0.29+).

## Test Cases to Verify
- DBB-010: `await Promise.resolve(42)` → `error` is `undefined`
- DBB-009: `console.log("hello")` → still works (sync path)
- DBB-011: `throw new Error("oops")` → `error` matches `/oops/`
- All 8 existing code-tool tests pass
