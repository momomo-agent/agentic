# Design — Implement MemoryStorage Backend

## Files to Create/Modify
- `src/backends/memory.ts` — new file
- `src/index.ts` — add export

## `src/backends/memory.ts`
```ts
import type { StorageBackend } from '../types.js'

export class MemoryStorage implements StorageBackend {
  private store = new Map<string, string>()

  async get(path: string): Promise<string | null> {
    return this.store.get(path) ?? null
  }

  async set(path: string, content: string): Promise<void> {
    this.store.set(path, content)
  }

  async delete(path: string): Promise<void> {
    this.store.delete(path)
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.store.keys()).map(k => k.startsWith('/') ? k : '/' + k)
    return prefix ? keys.filter(k => k.startsWith(prefix)) : keys
  }

  async scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>> {
    const results: Array<{ path: string; line: number; content: string }> = []
    for (const [path, value] of this.store) {
      value.split('\n').forEach((line, i) => {
        if (line.includes(pattern)) results.push({ path, line: i + 1, content: line })
      })
    }
    return results
  }
}
```

## `src/index.ts`
```ts
export { MemoryStorage } from './backends/memory.js'
```

## Edge Cases
- `list()` normalizes keys to have `/` prefix (keys stored without prefix must be normalized on read)
- `delete()` on missing key is a no-op (Map.delete is safe)
- No persistence — data lost on GC; intended for tests and quick-start

## Dependencies
- Blocked by task-1775531289579 (test suite must exist to verify contract compliance)

## Test Cases
- Passes shared `backendContract` test suite from `src/tests/backend.contract.ts`
- `set`/`get` round-trip returns same string
- `delete` removes key; subsequent `get` returns null
- `list()` paths all start with `/`
- `scan()` returns correct `{ path, line, content }` objects
