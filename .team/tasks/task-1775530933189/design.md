# Task Design: Implement Custom Provider Support

## File to Modify
`src/providers/provider.ts`

## Changes

### 1. `createProvider` — handle `custom` and unknown providers

```ts
export function createProvider(config: AgenticConfig): Provider {
  const provider = config.provider ?? detectProvider(config)

  if (provider !== 'custom' && !config.apiKey) {
    throw new Error('apiKey is required for provider: ' + provider)
  }

  switch (provider) {
    case 'anthropic':
      return createAnthropicProvider(config)
    case 'openai':
      return createOpenAIProvider(config)
    case 'custom':
      if (!config.baseUrl) throw new Error('baseUrl is required when provider="custom"')
      if (!config.apiKey) throw new Error('apiKey is required when provider="custom"')
      return createOpenAIProvider(config) // reuses OpenAI client with custom baseUrl
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}
```

### 2. Remove `customProvider` field usage
- `AgenticConfig.customProvider` is no longer used by `createProvider`
- Do NOT remove the type field (may be used externally); just stop reading it in `createProvider`

## Edge Cases
- `provider='custom'` + no `baseUrl` → throw
- `provider='custom'` + no `apiKey` → throw
- `provider='foobar'` → throw `Unknown provider: foobar`
- `provider='custom'` + valid `baseUrl` + `apiKey` → returns OpenAI-compatible provider

## Test Cases
1. `createProvider({ provider: 'custom', baseUrl: 'https://proxy.example.com', apiKey: 'key' })` → no throw
2. `createProvider({ provider: 'custom', apiKey: 'key' })` → throws `baseUrl is required`
3. `createProvider({ provider: 'custom', baseUrl: 'https://x.com' })` → throws `apiKey is required`
4. `createProvider({ provider: 'foobar' as any, apiKey: 'k' })` → throws `Unknown provider: foobar`
