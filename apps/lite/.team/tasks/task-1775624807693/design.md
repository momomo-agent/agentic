# Task Design — Fix askStream() to use runAgentLoopStream

## Problem

`askStream()` in `src/ask.ts` currently delegates to the legacy `agenticAsk` function, which:
1. Ignores `customProvider` — mock providers passed via `AgenticConfig.customProvider` are never used
2. Doesn't use `runAgentLoopStream()` from agentic-core — bypasses the proper streaming agent loop
3. Uses a manual chunk-buffering approach (`push`/`resolve`/`while` loop) instead of directly yielding from the async generator

Result: 10/12 tests in `test/ask-stream.test.ts` fail because mock providers are ignored.

## Solution

Rewrite `askStream()` to mirror the agentic-core architecture:
1. Use `createProvider()` from agentic-core to resolve the provider (handles `customProvider`, `baseUrl`, etc.)
2. Build tool definitions in agentic-core `ToolDefinition` format with an `executeToolCall` callback
3. Delegate to `runAgentLoopStream()` and yield `AgentStreamChunk` objects directly

## Files to Modify

- `src/ask.ts` — rewrite `askStream()` function (lines 88-124)

No other files need modification. `src/index.ts` already exports `askStream`.

## Implementation

### Step 1: Update imports in src/ask.ts

Replace the legacy `agenticAsk` import with proper agentic-core imports:

```typescript
import { createProvider, runAgentLoopStream } from 'agentic-core'
import type { AgentStreamChunk, ProviderToolCall } from 'agentic-core'
```

Remove the legacy import:
```typescript
// DELETE these lines:
import agenticCoreModule from 'agentic-core'
const agenticAsk = ...
```

**Note**: The non-streaming `ask()` function also uses `agenticAsk`. It must also be rewritten to use `createProvider()` + `runAgentLoop()` in the same change, OR the legacy import must be kept for `ask()` alone. Given that `ask()` tests currently pass, the safest approach is:
- Keep the legacy `agenticAsk` import for `ask()` only
- Add the new imports for `askStream()` only
- This avoids breaking the non-streaming path

### Step 2: Rewrite askStream()

New signature (unchanged):
```typescript
export async function* askStream(prompt: string, config: AgenticConfig = {}): AsyncGenerator<AgentStreamChunk>
```

Implementation outline:

```typescript
export async function* askStream(prompt: string, config: AgenticConfig = {}): AsyncGenerator<AgentStreamChunk> {
  // 1. Resolve filesystem (same as ask())
  const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })
  const resolvedConfig = { ...config, filesystem }

  // 2. Create provider via agentic-core
  const provider = createProvider({
    provider: config.provider ?? 'anthropic',
    customProvider: config.customProvider,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  })

  // 3. Build tool definitions in agentic-core ToolDefinition format
  const toolDefs = buildToolDefs(resolvedConfig)

  // 4. Track tool calls for final result
  const toolCalls: Array<{ tool: string; input: Record<string, unknown>; output: string }> = []

  // 5. Define executeToolCall callback
  const executeToolCall = async (tc: ProviderToolCall): Promise<string> => {
    const tool = buildTools(resolvedConfig).find(t => t.name === tc.name)
    if (!tool) throw new Error(`Unknown tool: ${tc.name}`)
    const output = await tool.execute(tc.input)
    toolCalls.push({ tool: tc.name, input: tc.input, output })
    return output
  }

  // 6. Delegate to runAgentLoopStream and yield chunks
  const stream = runAgentLoopStream({
    provider,
    prompt,
    systemPrompt: config.systemPrompt ?? OS_SYSTEM_PROMPT,
    toolDefs,
    executeToolCall,
  })

  for await (const chunk of stream) {
    yield chunk
  }
}
```

### Step 3: Add helper to build agentic-core ToolDefinition[]

`runAgentLoopStream` expects `toolDefs: ToolDefinition[]` (from agentic-core types: `{ name, description, parameters }`). We need a function that extracts just the definition metadata from the built tools:

```typescript
function buildToolDefs(config: AgenticConfig) {
  return buildTools(config).map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters ?? {},
  }))
}
```

## Key Mapping Points

| Legacy agenticAsk format | New agentic-core format |
|---|---|
| `config.tools` (array of tool objects with `execute`) | `toolDefs` (definitions only) + separate `executeToolCall` callback |
| `config.system` | `systemPrompt` in `AgentLoopConfig` |
| `config.stream: true` | `runAgentLoopStream()` inherently streams |
| `emit('token', data)` callback | Direct `yield` from async generator |

## Edge Cases

1. **Unknown tool**: `executeToolCall` should throw if tool name not found in `buildTools()` result
2. **Empty config**: `filesystem` defaults to in-memory `AgenticFileSystem` (same as `ask()`)
3. **No tools enabled**: `toolDefs` is empty array, loop runs text-only
4. **`ask()` must keep working**: legacy `agenticAsk` import stays for `ask()` only

## Test Verification

The following tests in `test/ask-stream.test.ts` must pass after the fix:

- `DBB-005: askStream() exists and is exported` — 2 tests (already pass)
- `askStream: text-only response` — 2 tests (currently fail: mock provider ignored)
- `askStream: tool use` — 1 test (currently fails: mock provider ignored)
- `askStream: config handling` — 3 tests (currently fail: mock provider ignored)
- `DBB-006: backward compatibility` — 1 test (should still pass: `ask()` unchanged)
- `askStream: error handling` — 2 tests (currently fail: mock provider ignored)
- `askStream: multi-round` — 1 test (currently fails: mock provider ignored)

Run: `npx vitest run test/ask-stream.test.ts`

All existing 174+ tests must also continue to pass:
Run: `npx vitest run`
