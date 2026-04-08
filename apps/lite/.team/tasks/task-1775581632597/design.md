# Design: Auto-instantiate default AgenticFileSystem

## Status
Already implemented in `src/ask.ts:17`:
```ts
const filesystem = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })
```

## Verification Task
- Run existing tests to confirm file tools work without passing `fs`
- No code changes needed
