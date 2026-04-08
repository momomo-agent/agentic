# Task Design: 实现 custom provider 钩子

## Files to Modify
- `src/providers/provider.ts`

## Current State
`createProvider()` already handles `provider='custom'`:
```ts
case 'custom':
  if (!config.customProvider) throw new Error('customProvider required when provider="custom"')
  return config.customProvider
```

## Fix (if missing)
Ensure the `custom` case is present in the switch and throws a clear error when `customProvider` is absent.

## Function Signature
```ts
export function createProvider(config: AgenticConfig): Provider
```

## Test Cases
1. `createProvider({ provider: 'custom', customProvider: mockProvider, apiKey: '' })` → returns `mockProvider`
2. `createProvider({ provider: 'custom', apiKey: '' })` → throws `'customProvider required when provider="custom"'`
