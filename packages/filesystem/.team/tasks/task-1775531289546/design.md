# Design: Unify list() path format (leading slash)

## Files to Modify
- `src/backends/agentic-store.ts` — normalize keys to have leading `/`
- `src/types.ts` — add doc comment clarifying path contract

## Analysis
- `NodeFsBackend.list()` already returns paths with `/` prefix (via `'/' + relative(...)`)
- `OPFSBackend.walkDir()` already pushes `'/' + path`
- `AgenticStoreBackend.list()` returns raw store keys — no normalization

## src/backends/agentic-store.ts
```ts
async list(prefix?: string): Promise<string[]> {
  const keys = await this.store.keys()
  const normalized = keys.map(k => k.startsWith('/') ? k : '/' + k)
  if (!prefix) return normalized
  return normalized.filter(k => k.startsWith(prefix))
}
```

Also normalize `set()` and `get()` key storage so keys are always stored with `/` prefix, ensuring consistency:
```ts
private normPath(path: string): string {
  return path.startsWith('/') ? path : '/' + path
}
```
Apply `normPath` in `get`, `set`, `delete`, `list`.

## Edge Cases
- Keys already stored without `/` in existing stores: `list()` normalization handles read-side; `normPath` in `set` ensures new writes are consistent
- `prefix` filter must also have `/` — callers should pass `/foo` not `foo`

## Test Cases
- Write at `foo/bar.txt`, `list()` → includes `/foo/bar.txt`
- Write at `/baz.txt`, `list()` → includes `/baz.txt` (no double slash)
- `list('/foo')` → only paths starting with `/foo`
