# Design: Document custom provider silent fallback behavior

## Files to Modify
- `src/types.ts` — add JSDoc to `AgenticConfig.baseUrl`

## Change
Add JSDoc comment to `baseUrl` field in `AgenticConfig`:

```ts
/**
 * Base URL for custom/proxy providers.
 * When provider='custom' and customProvider is not set,
 * this falls back to an OpenAI-compatible adapter automatically.
 */
baseUrl?: string
```

## Test Cases
- JSDoc is visible in IDE hover for `AgenticConfig.baseUrl`
- `tsc --noEmit` passes
