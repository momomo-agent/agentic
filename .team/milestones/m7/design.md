# M7 Technical Design: Custom Provider & Multi-Round Tool Loop

## Scope
Two changes to `src/providers/provider.ts` and verification of `src/ask.ts`.

## 1. Custom Provider via baseUrl+apiKey

**File:** `src/providers/provider.ts`

Current `provider='custom'` requires a `customProvider` object. New behavior: if `baseUrl` is provided with `apiKey`, create an OpenAI-compatible client automatically.

```ts
case 'custom':
  if (!config.baseUrl) throw new Error('baseUrl is required when provider="custom"')
  return createOpenAIProvider({ ...config, baseUrl: config.baseUrl })
```

Remove the `customProvider` path from `createProvider` (or keep as fallback — see task design).

Unknown providers: the `default` case in the switch currently falls through to openai. Change to throw.

## 2. Multi-Round Tool Loop

**File:** `src/ask.ts`

Reading the current code, `ask.ts` already has a `for` loop up to `MAX_TOOL_ROUNDS`. The task description says it "exits after one tool round" — this may be a stale description or a bug introduced elsewhere. The developer must verify the loop is correct and fix if needed.

## Dependencies
- task-1775530933189 must complete before task-1775530939117 (blocked)
- No new packages required; reuses `createOpenAIProvider` with custom `baseUrl`
