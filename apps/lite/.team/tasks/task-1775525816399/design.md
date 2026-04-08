# Design: Implement custom provider support

## Files
- `src/types.ts` — add `customProvider?: Provider` to `AgenticConfig`
- `src/providers/provider.ts` — handle `case 'custom'` in `createProvider()`

## Interface Changes
```ts
// types.ts
import type { Provider } from './providers/index.js'
AgenticConfig.customProvider?: Provider

// provider.ts — createProvider()
case 'custom':
  if (!config.customProvider) throw new Error('customProvider required when provider="custom"')
  return config.customProvider
```

## Edge Cases
- `provider: 'custom'` + no `customProvider` → throw descriptive error
- `customProvider` set but `provider !== 'custom'` → ignored

## Test Cases (DBB-013)
- `{ provider: 'custom', customProvider: mock }` → `mock.chat()` called
- `{ provider: 'custom' }` → throws Error
