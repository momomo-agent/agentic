# Design: Implement streaming scan()

## Files to Modify
- `src/types.ts` — add `scanStream()` to `StorageBackend` interface
- `src/backends/node-fs.ts` — implement `scanStream()` with `createReadStream`
- `src/backends/memory.ts` — implement `scanStream()`
- `src/backends/local-storage.ts` — implement `scanStream()`
- `src/backends/opfs.ts` — implement `scanStream()`
- `src/backends/agentic-store.ts` — implement `scanStream()`

## Interface Change (src/types.ts)

Add to `StorageBackend`:
```typescript
scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }>
```

Keep existing `scan()` — backends update it to delegate to `scanStream()`:
```typescript
async scan(pattern: string) {
  const results = []
  for await (const r of this.scanStream(pattern)) results.push(r)
  return results
}
```

## NodeFsBackend (src/backends/node-fs.ts)

Use `readline` + `createReadStream` to avoid loading full file:
```typescript
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

async *scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }> {
  const paths = await this.list()
  for (const path of paths) {
    const abs = this.abs(path)
    const rl = createInterface({ input: createReadStream(abs, 'utf-8'), crlfDelay: Infinity })
    let lineNum = 0
    for await (const line of rl) {
      lineNum++
      if (line.includes(pattern)) yield { path, line: lineNum, content: line }
    }
  }
}
```

## MemoryStorage / LocalStorageBackend / OPFSBackend / AgenticStoreBackend

All in-memory backends use the same generator pattern (no streaming benefit, but satisfies interface):
```typescript
async *scanStream(pattern: string) {
  // iterate store entries, split lines, yield matches
}
```

## Edge Cases
- File deleted between `list()` and stream read: catch ENOENT, skip silently
- Empty files: no yields, no error
- Pattern with regex special chars: use `String.includes()` (not regex) to match existing `scan()` behavior

## Test Cases (test/streaming-scan.test.ts)
- `scanStream()` yields same results as `scan()` for all backends
- Large file (>10MB): verify memory usage stays bounded (use `process.memoryUsage()` before/after)
- No matches: async iterator completes with zero yields
- Broken file mid-stream: error is caught, iteration continues with next file
