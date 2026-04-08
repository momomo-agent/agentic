# Design: Add system prompt support

## Files
- `src/types.ts` — add `systemPrompt?: string` to `AgenticConfig`
- `src/providers/provider.ts` — add `system?: string` to `Provider.chat()` signature
- `src/providers/anthropic.ts` — pass `system` as top-level field in API request
- `src/providers/openai.ts` — prepend `{ role: 'system', content: system }` to messages
- `src/ask.ts` — pass `config.systemPrompt` to `provider.chat()`

## Interface Changes
```ts
// types.ts
AgenticConfig.systemPrompt?: string

// provider.ts
Provider.chat(messages, tools, system?: string): Promise<ProviderResponse>
```

## Edge Cases
- `systemPrompt` undefined → no change in behavior
- Empty string → skip (treat as undefined)

## Test Cases (DBB-005, DBB-006)
- With `systemPrompt` → response shaped by it
- Without `systemPrompt` → completes normally
