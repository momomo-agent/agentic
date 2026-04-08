# Design: Fix openai.ts apiKey validation for custom+baseUrl provider

## Problem
`createOpenAIProvider` (line 7) unconditionally throws if `apiKey` is falsy, even when called via the `provider='custom'` + `baseUrl` path where no API key is needed.

## File to Modify
- `src/providers/openai.ts`

## Change

**Line 7** — replace unconditional guard with conditional:

```ts
// Before
if (!config.apiKey) throw new Error('apiKey is required for openai provider')

// After
if (!config.apiKey && !config.baseUrl) throw new Error('apiKey is required for openai provider')
```

**Line 33** — Authorization header should only be sent when apiKey is present:

```ts
// Before
'Authorization': `Bearer ${config.apiKey}`,

// After
...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
```

## Logic
- If `apiKey` is absent but `baseUrl` is set → assume proxy/custom usage, skip auth header, proceed.
- If both absent → throw (same as before for openai provider).
- If `apiKey` present → send Bearer header as before.

## Edge Cases
- `baseUrl` set but empty string `''` — falsy, so still throws. Acceptable.
- `apiKey` set alongside `baseUrl` — header is sent as before. No regression.

## Test Case (DBB-005)
```ts
// Should resolve without throwing
const provider = createOpenAIProvider({ provider: 'custom', baseUrl: 'http://localhost:11434' })
```
This test must pass without `.fails()` marker.
