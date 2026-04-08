# Technical Design: Add apiKey validation in detectProvider

## File to modify
`src/providers/provider.ts`

## Problem
`detectProvider` throws on missing apiKey but does not validate format. A key like `"bad-key"` silently proceeds and fails later with a cryptic provider error.

## Fix — add format validation in `createProvider` after provider is resolved

```ts
export function createProvider(config: AgenticConfig): Provider {
  const provider = config.provider ?? detectProvider(config)

  if (provider !== 'custom' && !config.apiKey) {
    throw new Error('apiKey is required for provider: ' + provider)
  }

  // Format validation
  if (provider === 'anthropic' && config.apiKey && !config.apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid apiKey format for anthropic provider (expected sk-ant- prefix)')
  }
  if (provider === 'openai' && config.apiKey && !config.apiKey.startsWith('sk-')) {
    throw new Error('Invalid apiKey format for openai provider (expected sk- prefix)')
  }

  switch (provider) {
    case 'anthropic': return createAnthropicProvider(config)
    case 'custom':
      if (!config.customProvider) throw new Error('customProvider required when provider="custom"')
      return config.customProvider
    case 'openai':
    default:
      return createOpenAIProvider(config)
  }
}
```

## No changes to `detectProvider` needed

## Edge cases
- `provider='custom'`: skips all apiKey checks
- `baseUrl`-detected anthropic with non-`sk-ant-` key: throws — correct behavior
- Valid keys pass through unchanged

## Test cases (in `test/provider.test.ts` or new file)
```ts
// throws on missing key
expect(() => createProvider({ provider: 'anthropic' })).toThrow('apiKey is required')

// throws on bad format
expect(() => createProvider({ provider: 'anthropic', apiKey: 'bad' })).toThrow('Invalid apiKey format')
expect(() => createProvider({ provider: 'openai', apiKey: 'bad' })).toThrow('Invalid apiKey format')

// valid keys do not throw (will fail at network, not validation)
expect(() => createProvider({ provider: 'anthropic', apiKey: 'sk-ant-abc' })).not.toThrow()

// custom provider skips validation
expect(() => createProvider({ provider: 'custom', customProvider: mockProvider })).not.toThrow()
```
