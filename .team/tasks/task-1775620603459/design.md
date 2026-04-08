# Task Design: Add tests for streaming and timeout

## Files to Modify/Create

1. `tests/streaming.test.ts` — new file for streaming tests
2. `tests/timeout.test.ts` — new file for timeout tests

## Depends On

- task-1775620573568 (streaming Provider interface)
- task-1775620587853 (askStream in agentic-lite)
- task-1775620592995 (code timeout enforcement)

## Streaming Tests — `tests/streaming.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { runAgentLoopStream } from '../packages/agentic-core/src/loop.js'
import { askStream } from '../src/ask.js'
import type { Provider, StreamChunk, ProviderMessage, ToolDefinition } from '../packages/agentic-core/src/types.js'
```

### Test 1: Provider stream() yields text_delta chunks
- Create a mock provider whose `stream()` yields `{type: 'text_delta', text: 'Hello'}`, `{type: 'text_delta', text: ' world'}`, `{type: 'message_stop'}`
- Call `runAgentLoopStream()` with this provider
- Collect all yielded chunks
- Assert: 2 text chunks with accumulated text, 1 done chunk

### Test 2: Provider stream() yields tool_use then executes
- Create mock provider: first stream() yields tool_use chunk, second call yields text then message_stop
- Provide mock executeToolCall that returns "tool result"
- Collect all chunks
- Assert: tool_start, tool_result, text, done chunks in order

### Test 3: runAgentLoopStream() accumulates usage across rounds
- Mock provider that reports usage: {input: 10, output: 5} per round
- Run 2 rounds (one with tool call, one without)
- Assert: done.result.usage = {input: 20, output: 10}

### Test 4: askStream() yields streaming chunks
- Mock provider + mock tool execution
- Call `askStream('test', {provider: 'custom', customProvider: mockProvider})`
- Iterate generator
- Assert: yields text chunks and done

### Test 5: askStream() backward compatibility
- Existing `ask()` test suite passes unchanged
- Verify `ask()` still returns `AgenticResult` (non-generator)

### Test 6: stream() error propagation
- Mock provider whose stream() throws mid-flight
- Assert: error propagates through the generator

## Timeout Tests — `tests/timeout.test.ts`

### Test 7: QuickJS timeout
```typescript
it('throws timeout error for infinite JS loop', async () => {
  const start = Date.now()
  await expect(
    executeCode({ code: 'while(true){}' }, undefined, 500)
  ).rejects.toThrow('Code execution timed out after 500ms')
  expect(Date.now() - start).toBeLessThan(2000)
})
```

### Test 8: Pyodide timeout (browser)
```typescript
it('throws timeout error for infinite Python loop (browser)', async () => {
  const start = Date.now()
  await expect(
    executeCode({ code: 'while True: pass' }, undefined, 500)
  ).rejects.toThrow('Code execution timed out after 500ms')
  expect(Date.now() - start).toBeLessThan(2000)
})
```

### Test 9: python3 timeout (Node)
```typescript
it('throws timeout error for infinite Python loop (Node)', async () => {
  const start = Date.now()
  await expect(
    executeCode({ code: 'while True: pass' }, undefined, 500)
  ).rejects.toThrow('Code execution timed out after 500ms')
  expect(Date.now() - start).toBeLessThan(2000)
})
```

### Test 10: No timeout — backward compatible
```typescript
it('executes normally without timeout', async () => {
  const result = await executeCode({ code: '1+1' }, undefined, undefined)
  expect(result.error).toBeUndefined()
})
```

### Test 11: timeout = 0 treated as no timeout
```typescript
it('timeout=0 means no enforcement', async () => {
  const result = await executeCode({ code: '1+1' }, undefined, 0)
  expect(result.error).toBeUndefined()
})
```

### Test 12: Fast code within timeout
```typescript
it('fast code completes within timeout', async () => {
  const result = await executeCode({ code: 'let x = 0; for(let i=0;i<100;i++){x+=i}; x' }, undefined, 5000)
  expect(result.output).toBe('4950')
})
```

## Backward Compatibility Check

Run `npm test` after all implementations to verify:
- All 174+ existing tests still pass
- No breaking changes to existing `ask()` API

## Dependencies

- task-1775620573568, task-1775620587853, task-1775620592995
