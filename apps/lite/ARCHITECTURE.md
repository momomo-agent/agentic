# Architecture

## Overview

agentic-lite is a minimal LLM agent library. It exposes a single `ask()` function that runs a tool-use loop until the model produces a final answer.

## Module Structure

- `src/index.ts` — public exports
- `src/ask.ts` — core agent loop (`ask()`)
- `src/types.ts` — all shared interfaces (`AgenticConfig`, `AgenticResult`, `Provider`, `ToolDefinition`)
- `src/providers/` — LLM provider adapters
  - `anthropic.ts` — Anthropic Claude adapter
  - `openai.ts` — OpenAI adapter
  - `provider.ts` — custom provider support
  - `index.ts` — `createProvider()` factory
- `src/tools/` — tool implementations
  - `search.ts` — web search
  - `code.ts` — code execution
  - `file.ts` — file read/write (via agentic-filesystem)
  - `shell.ts` — shell commands
  - `index.ts` — tool registry

## Data Flow

```
ask(prompt, config)
  → createProvider(config)
  → loop:
      provider.chat(messages)
      if stopReason === 'tool_use':
        executeToolCalls(toolCalls)
        append results to messages
      else:
        return AgenticResult
```

## Key Interfaces

- `AgenticConfig` — input config (provider, apiKey, model, tools, systemPrompt, filesystem)
- `AgenticResult` — output (answer, sources, images, codeResults, files, shellResults, toolCalls, usage)
- `Provider` — adapter interface with `chat()` method
- `ToolDefinition` — tool name, description, input schema, and execute function

## Provider Resolution

### Custom Provider Fallback

When `provider='custom'`:
1. If `config.customProvider` is set → use it directly
2. Else if `config.baseUrl` is set → fall back to OpenAI-compatible adapter (`createOpenAIProvider`)
3. Else → throw `Error('customProvider or baseUrl is required when provider="custom"')`


Add a 'Custom Provider Fallback' subsection documenting the three-step resolution: (1) customProvider set → use directly, (2) baseUrl set → fall back to OpenAI-compatible adapter, (3) neither → throw error.

Create ARCHITECTURE.md defining:
1. System architecture overview
2. Module structure (src/ organization)
3. Core interfaces and contracts (AgenticConfig, AgenticResult, Provider interface, Tool interface)
4. File organization and responsibilities
5. Dependencies between modules
6. Data flow through the agentic loop
7. Extension points (custom providers, custom tools)

Based on existing code structure:
- src/ask.ts — main agentic loop
- src/types.ts — core type definitions
- src/providers/ — LLM provider implementations
- src/tools/ — tool implementations (search, code, file, shell)
- src/index.ts — public API exports

Under 'Provider Resolution > Custom Provider Fallback', add: When provider='custom': 1) if config.customProvider is set → use it directly; 2) else if config.baseUrl is set → fall back to createOpenAIProvider; 3) else → throw Error('customProvider or baseUrl is required when provider="custom"')

In the 'Provider Resolution / Custom Provider Fallback' section, add: when customProvider is absent but baseUrl is set, createProvider falls back to createOpenAIProvider(baseUrl, apiKey, model). Also update README.md with a usage example showing this pattern.