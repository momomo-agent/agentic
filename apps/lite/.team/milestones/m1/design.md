# M1 Technical Design — Core Agentic Loop & Correctness

## Overview

Six targeted fixes to `src/ask.ts`, `src/providers/provider.ts`. `src/tools/file.ts` and `src/tools/code.ts` are already correct.

## Changes by File

### src/ask.ts
- **Multi-round loop** (task-1775525637055): Loop already exists. Verify it works end-to-end.
- **images fix** (task-1775525744093): Change `allImages.length > 0 ? allImages : undefined` → always return `allImages` (empty array, not undefined).
- **system prompt** (task-1775525748440): Add `systemPrompt?: string` param to `ask()`; pass to `provider.chat()`.

### src/providers/provider.ts
- **custom provider** (task-1775525816399): Add `case 'custom': return config.customProvider` in `createProvider()`. Add `customProvider?: Provider` to `AgenticConfig` in `types.ts`.
- **system prompt** (task-1775525748440): Add optional `system?: string` to `Provider.chat()` interface; thread through Anthropic and OpenAI adapters.

### src/tools/file.ts & src/tools/code.ts
- Already browser-compatible. No changes needed.

## Interface Changes

```ts
// types.ts
interface AgenticConfig {
  customProvider?: Provider   // add
}

// ask.ts
ask(prompt: string, config: AgenticConfig, systemPrompt?: string): Promise<AgenticResult>

// providers/provider.ts
Provider.chat(messages, tools, system?: string): Promise<ProviderResponse>
```

## Notes
- `allImages` must always be `string[]` in return (never undefined) — satisfies DBB-004.
- Anthropic `rawContent` replay must be preserved across all loop rounds.
