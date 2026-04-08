# Add streaming to agentic-core Provider interface

## Changes Made

### 1. `packages/agentic-core/src/types.ts`
- Added `StreamChunk` interface: `'text_delta' | 'tool_use' | 'message_stop'` with optional `text`, `toolCall`, `usage` fields
- Added `AgentStreamChunk` interface: `'text' | 'tool_start' | 'tool_result' | 'done'` with optional `text`, `toolCall`, `output`, `result` fields
- Extended `Provider` interface with `stream()` method returning `AsyncGenerator<StreamChunk>`

### 2. `packages/agentic-core/src/providers/anthropic.ts`
- Implemented `stream()` method using SSE parsing with `ReadableStream` reader
- Handles Anthropic streaming events: `content_block_start`, `content_block_delta` (text_delta + input_json_delta), `content_block_stop`, `message_delta`
- Tracks tool use blocks by index, accumulates `input_json`, yields `tool_use` on block stop

### 3. `packages/agentic-core/src/providers/openai.ts`
- Implemented `stream()` method using SSE parsing with `ReadableStream` reader
- Handles OpenAI streaming: content deltas, tool call deltas (accumulated by index), finish_reason
- Yields accumulated tool calls on finish

### 4. `packages/agentic-core/src/loop.ts`
- Added `runAgentLoopStream()` async generator function
- Multi-round loop using `provider.stream()` instead of `provider.chat()`
- Yields `text` (cumulative), `tool_start`, `tool_result`, and `done` with final result

### 5. `packages/agentic-core/src/index.ts`
- Exported `runAgentLoopStream`, `StreamChunk`, `AgentStreamChunk`

## Verification
- TypeScript type-check passes (no errors in agentic-core)
- `tsup` build succeeds (17.08 KB JS, 2.94 KB DTS)
- Pre-existing type errors in main package (missing node types) are unrelated

## Notes
- The `Provider` interface change requires custom providers to also implement `stream()`
- SSE buffer splitting across read chunks is handled by the buffer pattern
- Empty/malformed chunks are silently skipped (consistent with existing patterns)
