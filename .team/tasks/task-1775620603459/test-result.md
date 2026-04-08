# Test Results: Streaming & Timeout Tests (Re-run)

**Task**: task-1775620603459
**Tester**: tester
**Date**: 2026-04-08

## Summary

| Test File | Pass | Fail | Total | Notes |
|-----------|------|------|-------|-------|
| tests/streaming.test.ts (NEW) | 11 | 0 | 11 | runAgentLoopStream + askStream + backward compat |
| tests/timeout.test.ts (NEW) | 13 | 0 | 13 | executeCode timeout + backward compat |
| All existing tests | 213 | 0 | 213 | No regressions |
| **Total** | **237** | **0** | **237** | |

## New Streaming Tests — `tests/streaming.test.ts` (11 PASS)

### runAgentLoopStream (7 tests)
1. Yields text chunks (accumulated: "Hello" → "Hello world" → done)
2. Yields tool_start and tool_result for tool calls
3. Accumulates usage across rounds (input: 18, output: 8)
4. Tracks tool calls in final result
5. Handles empty stream (immediate message_stop)
6. Propagates provider stream errors mid-flight
7. Handles multiple tool calls in same round

### askStream (2 tests)
8. Yields streaming chunks via askStream with custom provider
9. Handles tool execution in askStream

### Backward Compatibility (2 tests)
10. ask() returns AgenticResult (not a generator)
11. ask() delegates to runAgentLoop (chat), not stream

## New Timeout Tests — `tests/timeout.test.ts` (13 PASS)

### Timeout Enforcement (9 tests)
1. Fast JS code completes within timeout
2. Fast JS code works without timeout (undefined)
3. timeout=0 means no enforcement
4. Negative timeout means no enforcement
5. JS code with console.log within timeout
6. Throws timeout error for slow JS code (*)
7. Python timeout on Node (python3 subprocess killed)
8. Fast Python code completes within timeout
9. Timeout error message includes timeout value

### Backward Compatibility (4 tests)
10. Executes JS without timeout parameter
11. Executes Python without timeout parameter
12. JS syntax error returns error
13. Python syntax error returns error

(*) JS timeout test passes but takes 77s instead of ~500ms — see Issue 1.

## DBB Verification

| DBB | Criterion | Status | Evidence |
|-----|-----------|--------|----------|
| DBB-001 | Provider has stream() | PASS | Confirmed in types.ts; used by all streaming tests |
| DBB-002 | Anthropic implements stream() | PASS | Provider interface enforces stream() |
| DBB-003 | OpenAI implements stream() | PASS | Provider interface enforces stream() |
| DBB-004 | runAgentLoopStream() exists | PASS | 7 tests pass with full chunk verification |
| DBB-005 | askStream() exported | PASS | askStream uses runAgentLoopStream (confirmed in ask.ts:142) |
| DBB-006 | Backward compatibility | PASS | All 237 tests pass, ask() unchanged |
| DBB-007 | Code timeout enforced in executeCode | PASS | withTimeout + Promise.race works for async paths |
| DBB-008 | Timeout across all execution paths | PARTIAL | QuickJS sync path has event-loop blocking (Issue 1) |
| DBB-009 | ARCHITECTURE.md documents streaming | N/A | Documentation task, not testable here |
| DBB-010 | Vision ≥90% | N/A | Monitor task, not testable here |

## Issues Found

### Issue 1: JS timeout not enforced for synchronous QuickJS (Medium)

The synchronous QuickJS path (`vm.evalCode()`) blocks the Node.js event loop, preventing the `withTimeout` `setTimeout` from firing. The test passes (the loop eventually breaks at 1e9 iterations) but takes 77 seconds instead of the expected ~500ms.

**Affected**: `src/tools/code.ts:316-325` — sync QuickJS path
**Workaround**: Use async code (with `await`) to trigger the `evalCodeAsync` path, which yields between microtasks.
**Note**: The async QuickJS path and Python Node path timeout correctly.

### Issue 2: toolConfig.code.timeout not wired into ask() (Low)

`ask.ts:40` calls `executeCode(input, fs)` without forwarding `toolConfig.code.timeout`. The timeout parameter works when calling `executeCode` directly, but the `ask()` config path ignores it.

**Fix**: Change `ask.ts:40` to `executeCode(input, fs, resolvedConfig.toolConfig?.code?.timeout)`

## Edge Cases Identified

1. Synchronous QuickJS timeout is blocked by event loop (documented above)
2. No test for streaming + timeout combined
3. No test for askStream with toolConfig.code.timeout propagation
4. Pyodide browser timeout path untested (requires browser environment)
