# Task Design — Make apiKey optional for custom provider

## File to Modify
- `src/types.ts`

## Change
```ts
// Before
apiKey: string

// After
apiKey?: string
```

## Logic
- Line ~14 in `src/types.ts`: change `apiKey: string` to `apiKey?: string`
- No other changes needed in types.ts

## Provider Validation
- `src/providers/anthropic.ts` and `src/providers/openai.ts` must throw if `apiKey` is missing/empty
- Check existing validation — if already present, no change needed; if not, add:
  ```ts
  if (!config.apiKey) throw new Error('apiKey is required for anthropic provider')
  ```

## Edge Cases
- `provider='custom'` with no `apiKey` → must not throw (apiKey unused)
- `provider='anthropic'` with no `apiKey` → must throw before any network call
- `provider='openai'` with no `apiKey` → must throw before any network call

## Test Cases
- Call `ask()` with `provider='custom'`, `customProvider` set, no `apiKey` → succeeds
- Call `ask()` with `provider='anthropic'`, no `apiKey` → throws with apiKey/auth error
