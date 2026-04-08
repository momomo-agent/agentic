# M28 Technical Design — Streaming & Timeout Enforcement

## Overview

This milestone adds two capabilities to close the remaining Vision gaps:
1. **Streaming support** — `Provider.stream()`, `runAgentLoopStream()`, and `askStream()`
2. **Code timeout enforcement** — wire `toolConfig.code.timeout` into `executeCode()`

## Architecture

```
agentic-lite (src/ask.ts)
  └── askStream() ──→ agentic-core (loop.ts)
                         └── runAgentLoopStream()
                               └── provider.stream() (SSE parsing)
```

### Streaming Data Flow

```
askStream(prompt, config)
  → createProvider(config)
  → runAgentLoopStream(config)
      loop:
        for await (chunk of provider.stream(messages, tools, system)):
          yield { type: 'text', text: chunk.text }      // partial text
          yield { type: 'tool_use', toolCall: chunk.tc } // tool call ready
        execute tool calls → yield { type: 'tool_result', ... }
        continue loop
      yield { type: 'done', answer, toolCalls, usage }
```

## Interfaces

### New types in `packages/agentic-core/src/types.ts`

```typescript
// Streaming chunk from a single provider.stream() call
interface StreamChunk {
  type: 'text_delta' | 'tool_use' | 'message_stop'
  text?: string                          // incremental text for text_delta
  toolCall?: ProviderToolCall            // complete tool call for tool_use
  usage?: { input: number; output: number }  // only on message_stop
}

// Streaming chunk from the agent loop
interface AgentStreamChunk {
  type: 'text' | 'tool_start' | 'tool_result' | 'done'
  text?: string                          // accumulated text so far (for 'text')
  toolCall?: { tool: string; input: Record<string, unknown> }
  output?: string                        // tool result for 'tool_result'
  result?: AgentLoopResult               // final result for 'done'
}
```

### Extended Provider interface

```typescript
interface Provider {
  chat(messages: ProviderMessage[], tools: ToolDefinition[], system?: string): Promise<ProviderResponse>
  stream(messages: ProviderMessage[], tools: ToolDefinition[], system?: string): AsyncGenerator<StreamChunk>
}
```

### New function in `packages/agentic-core/src/loop.ts`

```typescript
export async function* runAgentLoopStream(config: AgentLoopConfig): AsyncGenerator<AgentStreamChunk>
```

### New function in `src/ask.ts`

```typescript
export async function* askStream(prompt: string, config: AgenticConfig): AsyncGenerator<AgentStreamChunk>
```

## Implementation Plan

### Task 1: Streaming Provider Interface (task-1775620573568)
**Files**: `packages/agentic-core/src/types.ts`, `packages/agentic-core/src/providers/anthropic.ts`, `openai.ts`, `loop.ts`

1. Add `StreamChunk` interface to types.ts
2. Add `stream()` to `Provider` interface (required method)
3. Implement `stream()` in anthropic.ts:
   - Set `stream: true` in request body
   - Parse SSE events: `content_block_delta` → `text_delta`, `content_block_start` (tool_use) → `tool_use`, `message_stop` → `message_stop`
   - Use `response.body.getReader()` for incremental reading
4. Implement `stream()` in openai.ts:
   - Set `stream: true` in request body
   - Parse SSE `data:` lines: `delta.content` → `text_delta`, `delta.tool_calls` → `tool_use`, `finish_reason` → `message_stop`
   - Reuse existing `reassembleSSE` logic as reference
5. Add `runAgentLoopStream()` to loop.ts:
   - Same loop structure as `runAgentLoop()` but uses `provider.stream()` instead of `provider.chat()`
   - Yields `AgentStreamChunk` for each event
   - Accumulates text across chunks; on `tool_use`, executes tools and yields `tool_result`
   - On `message_stop` with no tool calls, yields `done` and returns

### Task 2: Expose Streaming in agentic-lite (task-1775620587853)
**Files**: `src/ask.ts`, `src/index.ts`

1. Add `askStream()` async generator function to ask.ts
2. Build tool defs and executeToolCall callback same as `ask()`
3. Delegate to `runAgentLoopStream()` from agentic-core
4. Accumulate sources/codeResults/files/shellResults same as `ask()`
5. Export `askStream` from `src/index.ts`

### Task 3: Enforce Code Timeout (task-1775620592995)
**Files**: `src/tools/code.ts`, `src/ask.ts`

1. Thread `timeout` parameter through `executeCode(input, filesystem?, timeout?)`
2. In `ask.ts` handleToolCall, pass `config.toolConfig?.code?.timeout` to `executeCode()`
3. In code.ts, wrap each execution path with `Promise.race()`:
   - **QuickJS**: wrap `vm.evalCode()` in a promise, race against `setTimeout(reject, timeout)`
   - **Pyodide**: wrap `pyodide.runPythonAsync()` in a promise, race against timeout
   - **python3 Node**: use `child_process.execFile` with `timeout` option, or `AbortController` + `setTimeout`
4. On timeout, throw `Error('Code execution timed out after ${timeout}ms')`
5. Default: if no timeout provided, no enforcement (backward compatible)

### Task 4: Update ARCHITECTURE.md (task-1775620598483)
**Files**: `ARCHITECTURE.md`

1. Add `Provider.stream()` to Key Interfaces section
2. Add streaming data flow diagram
3. Document `runAgentLoopStream()` in loop section
4. Document `askStream()` in public API section
5. Add timeout enforcement note under code_exec tool

### Task 5: Tests (task-1775620603459)
**Files**: `tests/streaming.test.ts`, `tests/timeout.test.ts` (or existing test files)

1. **Streaming tests**:
   - mock anthropic SSE → verify chunks yielded
   - mock openai SSE → verify chunks yielded
   - `runAgentLoopStream()` with mock provider → verify text/tool/done chunks
   - `askStream()` end-to-end with mock
2. **Timeout tests**:
   - QuickJS infinite loop + timeout=500 → rejects with timeout error
   - Pyodide infinite loop + timeout=500 → rejects with timeout error
   - python3 infinite loop + timeout=500 → rejects with timeout error
   - No timeout provided → no enforcement (existing behavior)
3. **Backward compatibility**: existing 174 tests still pass

## Edge Cases

- **Empty stream**: provider returns no text and no tool calls → yield `done` with empty answer
- **Stream error mid-flight**: provider connection drops → propagate error through generator
- **Timeout = 0**: treat as "no timeout" (same as undefined)
- **Very large timeout**: no upper bound enforced; trust the caller
- **Custom provider without stream()**: custom providers must implement `stream()` — document this requirement
- **Streaming with tool calls**: tool execution is NOT streamed (only provider output is streamed); tool results yield a single `tool_result` chunk
