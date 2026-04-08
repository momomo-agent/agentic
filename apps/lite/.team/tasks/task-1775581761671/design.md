# Design: Search tool graceful degradation without API key

## File to Modify
- `src/tools/search.ts`

## Changes

### searchTavily (line ~38)
```ts
// Before
if (!apiKey) throw new Error('Search requires apiKey — set toolConfig.search.apiKey')

// After
if (!apiKey) return { text: 'Search requires an API key — set toolConfig.search.apiKey', sources: [] }
```

### searchSerper (line ~55)
```ts
// Before
if (!apiKey) throw new Error('Search requires apiKey — set toolConfig.search.apiKey')

// After
if (!apiKey) return { text: 'Search requires an API key — set toolConfig.search.apiKey', sources: [] }
```

## Return Type
Both functions already return `{ text: string; sources: Source[] }` — no type changes needed.

## Edge Cases
- `executeSearch()` caller in `ask.ts` handles the result normally (no throw = no crash)
- Empty `sources: []` is valid per `AgenticResult.sources` type

## Test Cases
- `executeSearch({ query: 'test' }, undefined)` → returns graceful message, no throw
- `executeSearch({ query: 'test' }, { provider: 'serper' })` → returns graceful message, no throw
