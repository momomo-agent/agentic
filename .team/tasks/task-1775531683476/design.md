# Design: Fix scan() return type inconsistency

## Files to Modify
- `src/types.ts` — update `StorageBackend.scan()` return type
- `src/backends/agentic-store.ts` — fix scan() implementation

## Changes

### src/types.ts
Update the `StorageBackend` interface:
```ts
scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>>
```

### src/backends/agentic-store.ts
Replace current `scan()` which returns `{path, content}` with line-aware version:

```ts
async scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>> {
  const keys = await this.store.keys()
  const results: Array<{ path: string; line: number; content: string }> = []
  for (const key of keys) {
    const value = await this.store.get(key)
    if (typeof value !== 'string') continue
    value.split('\n').forEach((line, i) => {
      if (line.includes(pattern)) results.push({ path: key, line: i + 1, content: line })
    })
  }
  return results
}
```

## Edge Cases
- Non-string values in store: skip (already handled by `typeof value !== 'string'`)
- Empty file: produces no results (correct)
- Pattern matches multiple lines: each line emitted as separate result

## Dependencies
- `filesystem.ts` `literalGrep()` already iterates `scan()` results by line — no change needed there once types align

## Test Cases
- Write `"hello\nworld"` at `/a.txt`, scan `"hello"` → `[{path:"/a.txt", line:1, content:"hello"}]`
- Scan for absent pattern → `[]`
- Multi-line match → multiple results with correct `line` numbers
