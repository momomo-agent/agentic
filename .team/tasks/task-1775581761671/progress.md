# Search tool graceful degradation without API key

## Progress

- Changed `throw new Error(...)` to `return { text: '...', sources: [] }` in both searchTavily and searchSerper
- src/tools/search.ts lines 39 and 58
