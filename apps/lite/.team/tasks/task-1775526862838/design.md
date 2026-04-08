# Design: Fix provider apiKey validation

## File to modify
`src/providers/provider.ts`

## Changes

### In `createProvider(config: AgenticConfig): Provider`
Add before the switch statement:
```ts
if (provider !== 'custom' && !config.apiKey) {
  throw new Error('apiKey is required for provider: ' + provider)
}
```

### In `detectProvider(config: AgenticConfig): string`
Add at top:
```ts
if (!config.apiKey) throw new Error('apiKey is required')
```

## Edge Cases
- `apiKey = ""` — falsy, caught by `!config.apiKey`
- `provider = 'custom'` — skip validation (customProvider handles auth)
- `apiKey` present but wrong format — not validated here (provider SDK will error)

## Test Cases
- `ask('hi', { apiKey: '' })` → throws before any network call
- `ask('hi', {})` → throws with message referencing apiKey
- `ask('hi', { provider: 'custom', customProvider: mock })` → no throw
