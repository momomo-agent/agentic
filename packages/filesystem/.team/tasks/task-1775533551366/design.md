# Design: Implement batchGet and batchSet operations

## Files to Modify

- `src/types.ts` — add `batchGet` and `batchSet` to `StorageBackend` interface
- `src/backends/node-fs.ts` — implement on `NodeFsBackend`
- `src/backends/opfs.ts` — implement on `OPFSBackend`
- `src/backends/agentic-store.ts` — implement on `AgenticStoreBackend`

## Interface Changes (src/types.ts)

Add to `StorageBackend`:

```ts
batchGet(paths: string[]): Promise<Record<string, string | null>>
batchSet(entries: Record<string, string>): Promise<void>
```

## Implementation per Backend

All three backends implement batch ops as parallel `Promise.all` over existing `get`/`set`:

### NodeFsBackend / OPFSBackend / AgenticStoreBackend

```ts
async batchGet(paths: string[]): Promise<Record<string, string | null>> {
  const results = await Promise.all(paths.map(p => this.get(p)))
  return Object.fromEntries(paths.map((p, i) => [p, results[i]]))
}

async batchSet(entries: Record<string, string>): Promise<void> {
  await Promise.all(Object.entries(entries).map(([p, v]) => this.set(p, v)))
}
```

## Edge Cases

- Empty `paths` array → return `{}`
- Empty `entries` object → no-op
- Duplicate paths in `batchGet` → each resolved independently (last write wins for `batchSet` with duplicates — not applicable since `entries` is a Record)
- Path normalization: each backend's existing `get`/`set` handles it

## Dependencies

- No new dependencies; delegates to existing `get`/`set` per backend

## Test Cases

- `batchGet(['/a', '/b'])` where `/a` exists, `/b` does not → `{ '/a': 'content', '/b': null }`
- `batchSet({ '/x': 'v1', '/y': 'v2' })` then `batchGet(['/x', '/y'])` → both values returned
- `batchGet([])` → `{}`
- `batchSet({})` → resolves without error
