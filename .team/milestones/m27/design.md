# Milestone 27 Technical Design — agentic-core Extraction

## Goal

Extract the agent loop, provider abstraction, and core types from `src/ask.ts` and `src/providers/` into a new `packages/agentic-core/` package. This closes the vision gap where agentic-lite should compose agentic-core + agentic-filesystem + agentic-shell.

## Architecture

### Before
```
agentic-lite/
  src/
    ask.ts          (140 lines — loop + tool dispatch + tool definitions)
    types.ts        (AgenticConfig, AgenticResult, tool result types)
    providers/      (Provider interface, anthropic/openai adapters, createProvider)
    tools/          (search, code, file, shell implementations)
    index.ts
```

### After
```
packages/agentic-core/
  src/
    index.ts            (exports)
    loop.ts             (runAgentLoop)
    types.ts            (Provider, ProviderMessage, ToolDefinition, etc.)
    providers/
      index.ts          (createProvider factory)
      anthropic.ts      (Anthropic adapter)
      openai.ts         (OpenAI adapter)
  package.json
  tsconfig.json
  tsup.config.ts

agentic-lite/
  src/
    ask.ts              (<100 lines — thin integration: config resolution, tool registration, delegates to runAgentLoop)
    types.ts            (AgenticConfig, AgenticResult — kept here as they reference tool-specific types)
    providers/          (removed — now in agentic-core)
    tools/              (unchanged)
    index.ts            (re-exports agentic-core types for backward compat)
```

### Separation of Concerns

**agentic-core owns:**
- Agent loop (`runAgentLoop`) — generic loop with tool dispatch callback
- Provider abstraction (`Provider` interface, `createProvider` factory)
- Provider adapters (anthropic.ts, openai.ts)
- Core types: `Provider`, `ProviderMessage`, `ProviderResponse`, `ToolDefinition`, `ProviderToolCall`
- `MAX_TOOL_ROUNDS` constant

**agentic-lite owns:**
- `AgenticConfig` (references `AgenticFileSystem`, `ToolName`)
- `AgenticResult` (references tool-specific result types)
- Tool implementations (search, code, file, shell)
- Tool definition registry (`buildToolDefs`)
- System prompt assembly
- `ask()` function (thin integration layer)

### Key Interface: `runAgentLoop`

```typescript
// packages/agentic-core/src/loop.ts

export interface AgentLoopConfig {
  provider: Provider
  tools: ToolDefinition[]
  systemPrompt?: string
  prompt: string
  onToolCall?: (tc: ProviderToolCall) => Promise<ToolResult>
}

export interface ToolResult {
  toolCallId: string
  content: string
}

export interface AgentLoopResult {
  text: string
  usage: { input: number; output: number }
  toolCalls: ProviderToolCall[]
}

export async function runAgentLoop(config: AgentLoopConfig): Promise<AgentLoopResult>
```

The `onToolCall` callback is the integration point — agentic-lite provides it to dispatch to the actual tool implementations. agentic-core handles the loop, message management, and provider calls.

### Backward Compatibility

`ask()` signature and `AgenticResult` shape are **unchanged**. agentic-lite re-exports core types from agentic-core so that existing consumers see the same public API:

```typescript
// agentic-lite/src/index.ts
export { ask } from './ask.js'
export { createProvider } from 'agentic-core'
export type { Provider, ProviderMessage, ToolDefinition, ProviderToolCall } from 'agentic-core'
export type { AgenticConfig, AgenticResult, ... } from './types.js'
```

## Dependency Graph

```
agentic-lite → agentic-core → (no external deps beyond fetch)
           → agentic-filesystem
           → agentic-shell
           → quickjs-emscripten
           → pyodide
```

agentic-core has **zero** tool-specific dependencies. It only uses `fetch` (global) for provider API calls.

## Build Setup

agentic-core uses tsup with same config as agentic-lite (ESM, dts, es2022 target). agentic-lite lists agentic-core as a `link:../agentic-core` dependency (peer monorepo pattern, consistent with how agentic-filesystem and agentic-shell are linked).

## Risk Mitigation

1. **Provider circular deps**: `createProvider` currently imports `AgenticConfig` from agentic-lite's types. Solution: agentic-core defines its own minimal `ProviderConfig` type (apiKey, baseUrl, model, provider name, customProvider). agentic-lite maps its `AgenticConfig` to `ProviderConfig` before calling `createProvider`.

2. **Tool dispatch coupling**: The current loop hardcodes tool dispatch (switch on tool name). The `onToolCall` callback decouples this cleanly — agentic-core never references tool implementations.

3. **Test breakage**: All 107 tests import from agentic-lite. Since agentic-lite re-exports everything and `ask()` keeps the same signature, tests should pass without modification. If any test imports provider internals directly, the re-export handles it.

## Task Sequence

1. **task-1775615888978** — Create agentic-core package structure (package.json, tsconfig, tsup, directory layout)
2. **task-1775615923116** — Extract agent loop + providers into agentic-core (move code, define interfaces)
3. **task-1775613090477** — Refactor ask.ts to import from agentic-core (thin integration layer)
4. **task-1775615948444** — Update ARCHITECTURE.md for new module structure
5. **task-1775615948484** — Verify all 107 tests pass
