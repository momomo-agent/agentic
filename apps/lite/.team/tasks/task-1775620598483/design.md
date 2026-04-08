# Task Design: Update ARCHITECTURE.md for streaming API

## Files to Modify

1. `ARCHITECTURE.md` — add streaming documentation

## Depends On

- task-1775620573568 (streaming Provider interface)

## Changes to ARCHITECTURE.md

### 1. Add StreamChunk and AgentStreamChunk to Key Interfaces section

After the existing `Provider` interface, add:

```
- `StreamChunk` — incremental event from provider.stream() (text_delta, tool_use, message_stop)
- `AgentStreamChunk` — incremental event from runAgentLoopStream() (text, tool_start, tool_result, done)
```

### 2. Extend Provider description

Current:
- `Provider` — adapter interface with `chat()` method

Change to:
- `Provider` — adapter interface with `chat()` (non-streaming) and `stream()` (async generator) methods

### 3. Add streaming data flow

After the existing data flow diagram, add a second diagram:

```
askStream(prompt, config)
  → createProvider(config)
  → loop (runAgentLoopStream):
      for await (chunk of provider.stream(messages, tools, system)):
        chunk.type === 'text_delta'  → yield { type: 'text', text }
        chunk.type === 'tool_use'    → collect tool calls
        chunk.type === 'message_stop'→ execute tools → yield { type: 'tool_result' }
      yield { type: 'done', answer, toolCalls, usage }
```

### 4. Add public API entry points section

Add after data flow:

```
## Public API

- `ask(prompt, config)` → `AgenticResult` — non-streaming, returns complete result
- `askStream(prompt, config)` → `AsyncGenerator<AgentStreamChunk>` — streaming, yields partial results
```

### 5. Add timeout enforcement note

Under the code_exec tool description (or in a new section):

```
## Code Execution Timeout

`toolConfig.code.timeout` (ms) is enforced via Promise.race() across all execution paths:
- QuickJS (browser): wraps vm.evalCode() with timeout
- Pyodide (browser): wraps runPythonAsync() with timeout
- python3 (Node): uses execFile's built-in timeout option

Default: no timeout if not specified (backward compatible).
```

## Edge Cases

- None — this is a documentation-only task

## Dependencies

- task-1775620573568 (streaming Provider interface — defines the interfaces being documented)
