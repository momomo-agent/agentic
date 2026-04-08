# Design: Make AgenticConfig.apiKey optional for custom provider

## Status
Type is already optional (`apiKey?: string` in `src/types.ts:14`). Validation in `src/providers/provider.ts` already skips apiKey check for `provider='custom'` (line 46).

## What exists
```ts
// src/providers/provider.ts:46
if (provider !== 'custom' && !config.apiKey) {
  throw new Error('apiKey is required for provider: ' + provider)
}
```

## Gap to close
`detectProvider()` (called when `config.provider` is undefined) throws if no `apiKey`:
```ts
function detectProvider(config: AgenticConfig): string {
  if (!config.apiKey) throw new Error('apiKey is required')  // line 72
  ...
}
```
This is only reached when `config.provider` is `undefined`. If caller sets `provider: 'custom'` explicitly, `detectProvider` is never called — so the gap is already closed for explicit custom provider usage.

## Files to modify

### `README.md`
- Document that `apiKey` is optional when `provider='custom'`
- Add example showing custom provider usage without `apiKey`

## Verification
- `ask({ prompt: "...", provider: 'custom', customProvider: myFn })` with no `apiKey` → no error thrown
- `ask({ prompt: "...", provider: 'anthropic' })` with no `apiKey` → throws before network call

## Test cases
1. `provider='custom'` + `customProvider` set + no `apiKey` → succeeds
2. `provider='custom'` + `baseUrl` set + no `apiKey` → succeeds (falls back to OpenAI-compatible)
3. `provider='anthropic'` + no `apiKey` → throws `'apiKey is required for provider: anthropic'`
4. `provider='openai'` + no `apiKey` → throws `'apiKey is required for provider: openai'`
