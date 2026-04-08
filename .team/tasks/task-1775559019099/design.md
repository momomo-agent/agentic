# Task Design: Fix custom provider apiKey skip

## File to Modify
- `src/providers/provider.ts`

## Change

In the `custom` case of `createProvider`, remove the `apiKey` required check:

```ts
case 'custom':
  if (config.customProvider) return config.customProvider
  if (!config.baseUrl) throw new Error('customProvider or baseUrl is required when provider="custom"')
  // REMOVE: if (!config.apiKey) throw new Error('apiKey is required when provider="custom"')
  return createOpenAIProvider(config)
```

## Logic
- `provider='custom'` with `baseUrl` only → valid use case (e.g. local LLM, no auth needed)
- `provider='custom'` with `customProvider` → unchanged
- `provider='custom'` with neither `baseUrl` nor `customProvider` → still throws

## Edge Cases
- `createOpenAIProvider` must tolerate `apiKey` being undefined — verify it doesn't throw internally
- No change to anthropic/openai paths

## Test Cases
- `createProvider({ provider: 'custom', baseUrl: 'http://localhost:11434' })` → no throw
- `createProvider({ provider: 'custom' })` → throws "customProvider or baseUrl is required"
- `createProvider({ provider: 'custom', customProvider: mockProvider })` → returns mockProvider
