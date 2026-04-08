# Task Design: Extract Agent Loop + Provider into agentic-core

## Overview

Move the agent loop logic and provider abstraction from agentic-lite into the agentic-core package. This is the core extraction task.

## Files to Create in `packages/agentic-core/src/`

### 1. `types.ts` — Core type definitions

Extract from `src/providers/provider.ts` and `src/types.ts`:

```typescript
// agentic-core types — provider and loop abstractions

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ProviderToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ProviderResponse {
  text: string
  toolCalls: ProviderToolCall[]
  usage: { input: number; output: number }
  stopReason: 'end' | 'tool_use'
  rawContent?: unknown[]
}

export interface ProviderMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string | ProviderToolContent[] | unknown[]
}

export interface ProviderToolContent {
  type: 'tool_result'
  toolCallId: string
  content: string
}

export interface Provider {
  chat(messages: ProviderMessage[], tools: ToolDefinition[], system?: string): Promise<ProviderResponse>
}

/** Minimal config for provider creation (replaces AgenticConfig dependency) */
export interface ProviderConfig {
  provider?: 'anthropic' | 'openai' | 'custom'
  customProvider?: Provider
  apiKey?: string
  baseUrl?: string
  model?: string
}

/** Config for runAgentLoop */
export interface AgentLoopConfig {
  provider: Provider
  prompt: string
  systemPrompt?: string
  toolDefs: ToolDefinition[]
  executeToolCall: (toolCall: ProviderToolCall) => Promise<string>
  maxToolRounds?: number
}

/** Result from runAgentLoop */
export interface AgentLoopResult {
  answer: string
  toolCalls: Array<{ tool: string; input: Record<string, unknown>; output: unknown }>
  usage: { input: number; output: number }
}
```

Key change: `ProviderConfig` replaces the dependency on `AgenticConfig` from agentic-lite. Provider adapters take this minimal interface.

### 2. `providers/anthropic.ts` — Anthropic adapter

Copy from `src/providers/anthropic.ts` with these changes:
- Import types from `../types.js` (same package) instead of `../types.js` (agentic-lite)
- Change function signature: `createAnthropicProvider(config: ProviderConfig)` instead of `createAnthropicProvider(config: AgenticConfig)`
- All internal logic stays the same

```typescript
import type { ProviderConfig } from '../types.js'
import type { Provider, ProviderMessage, ProviderResponse, ToolDefinition } from '../types.js'

export function createAnthropicProvider(config: ProviderConfig): Provider {
  if (!config.apiKey) throw new Error('apiKey is required for anthropic provider')
  const base = (config.baseUrl ?? 'https://api.anthropic.com').replace(/\/+$/, '')
  const endpoint = base.endsWith('/v1') ? `${base}/messages` : `${base}/v1/messages`
  const model = config.model ?? 'claude-sonnet-4-20250514'

  return {
    async chat(messages: ProviderMessage[], tools: ToolDefinition[], system?: string): Promise<ProviderResponse> {
      // ... identical body to current implementation ...
    }
  }
}
// ... AnthropicResponse types, convertMessages, parseResponse — same as current
```

### 3. `providers/openai.ts` — OpenAI adapter

Copy from `src/providers/openai.ts` with same changes:
- `createOpenAIProvider(config: ProviderConfig)` instead of `createOpenAIProvider(config: AgenticConfig)`
- Import types from `../types.js` (same package)
- All internal logic (SSE reassembly, message conversion, response parsing) stays identical

### 4. `providers/index.ts` — Provider factory

Copy from `src/providers/provider.ts` (the `createProvider` and `detectProvider` functions):
- Change `createProvider(config: AgenticConfig)` → `createProvider(config: ProviderConfig)`
- Import types from `../types.js` (same package)
- Re-export all provider types

```typescript
import type { ProviderConfig } from '../types.js'
import { createAnthropicProvider } from './anthropic.js'
import { createOpenAIProvider } from './openai.js'

export function createProvider(config: ProviderConfig): Provider {
  const provider = config.provider ?? detectProvider(config)
  // ... same validation and switch logic, using ProviderConfig
}

function detectProvider(config: ProviderConfig): string {
  // ... same logic
}
```

### 5. `loop.ts` — Agent loop

Extract the loop from `src/ask.ts` lines 31-62. This is a generic function that takes a tool executor callback:

```typescript
import type { AgentLoopConfig, AgentLoopResult, ProviderMessage, ProviderToolCall } from './types.js'

const DEFAULT_MAX_TOOL_ROUNDS = 10

export async function runAgentLoop(config: AgentLoopConfig): Promise<AgentLoopResult> {
  const maxRounds = config.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS
  const messages: ProviderMessage[] = [{ role: 'user', content: config.prompt }]
  const allToolCalls: AgentLoopResult['toolCalls'] = []
  let totalUsage = { input: 0, output: 0 }

  for (let round = 0; round < maxRounds; round++) {
    const response = await config.provider.chat(messages, config.toolDefs, config.systemPrompt)
    totalUsage.input += response.usage.input
    totalUsage.output += response.usage.output

    if (response.stopReason !== 'tool_use' || response.toolCalls.length === 0) {
      return { answer: response.text, toolCalls: allToolCalls, usage: totalUsage }
    }

    // Execute each tool call via the provided callback
    const toolResults: Array<{ type: 'tool_result'; toolCallId: string; content: string }> = []
    for (const tc of response.toolCalls) {
      const output = await config.executeToolCall(tc)
      allToolCalls.push({ tool: tc.name, input: tc.input, output })
      toolResults.push({ type: 'tool_result', toolCallId: tc.id, content: String(output) })
    }

    // Anthropic needs rawContent for assistant turn replay
    messages.push({ role: 'assistant', content: response.rawContent ?? response.text ?? '' })
    messages.push({ role: 'tool', content: toolResults })
  }

  throw new Error(`Agent loop exceeded ${maxRounds} rounds`)
}
```

### 6. `index.ts` — Public exports

```typescript
export { runAgentLoop } from './loop.js'
export { createProvider } from './providers/index.js'
export { createAnthropicProvider } from './providers/anthropic.js'
export { createOpenAIProvider } from './providers/openai.js'
export type {
  Provider, ProviderMessage, ProviderResponse, ToolDefinition,
  ProviderToolCall, ProviderToolContent, ProviderConfig,
  AgentLoopConfig, AgentLoopResult,
} from './types.js'
```

## Steps

1. Create `packages/agentic-core/src/types.ts` with all shared types
2. Create `packages/agentic-core/src/providers/anthropic.ts` — copy + adapt from src/providers/anthropic.ts
3. Create `packages/agentic-core/src/providers/openai.ts` — copy + adapt from src/providers/openai.ts
4. Create `packages/agentic-core/src/providers/index.ts` — createProvider + detectProvider + re-exports
5. Create `packages/agentic-core/src/loop.ts` — runAgentLoop
6. Create `packages/agentic-core/src/index.ts` — public exports
7. `cd packages/agentic-core && npm run build` — verify clean build

## Dependencies

- Depends on task-1775615888978 (package structure must exist)
- Blocks task-1775613090477 (refactoring ask.ts)

## Edge Cases

- **Import path differences**: anthropic.ts and openai.ts currently import `AgenticConfig` from `../types.js`. After extraction, they import `ProviderConfig` from `../types.js` (same relative path, different package).
- **Provider factory validation**: The apiKey format checks (`sk-ant-`, `sk-`) stay in `createProvider()`. The `ProviderConfig` interface has optional `apiKey`.
- **rawContent passthrough**: The Anthropic provider returns `rawContent` in `ProviderResponse`. The loop must pass this through to the assistant message. This is critical for multi-round tool use with Anthropic.

## Acceptance

- `cd packages/agentic-core && npm run build` exits 0
- All types exported: Provider, ProviderMessage, ToolDefinition, ProviderToolCall, runAgentLoop, createProvider
- No imports from agentic-lite (grep for 'agentic-lite' returns nothing)
- No imports from agentic-filesystem, agentic-shell, quickjs, pyodide
