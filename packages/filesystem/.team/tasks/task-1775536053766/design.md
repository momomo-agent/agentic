# Task Design: Implement localStorage Backend

## File to Create
`src/backends/local-storage.ts`

## File to Modify
`src/index.ts` — add `export { LocalStorageBackend } from './backends/local-storage.js'`

## Class Signature
```ts
export class LocalStorageBackend implements StorageBackend {
  private prefix = 'afs:'

  private key(path: string): string  // returns `afs:${normalizePath(path)}`
  private normalizePath(path: string): string  // ensures leading /

  async get(path: string): Promise<string | null>
  async set(path: string, content: string): Promise<void>
  async delete(path: string): Promise<void>
  async list(prefix?: string): Promise<string[]>
  async scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>>
  async batchGet(paths: string[]): Promise<Record<string, string | null>>
  async batchSet(entries: Record<string, string>): Promise<void>
}
```

## Algorithm
- `key(path)`: `'afs:' + (path.startsWith('/') ? path : '/' + path)`
- `get`: `localStorage.getItem(key(path)) ?? null`
- `set`: `localStorage.setItem(key(path), content)`
- `delete`: `localStorage.removeItem(key(path))`
- `list(prefix?)`: iterate `localStorage` keys 0..length-1, filter by `afs:` prefix, strip `afs:` to get path, then filter by `prefix` if provided
- `scan(pattern)`: for each key in `list()`, get content, split by `\n`, push matches
- `batchGet`: `Promise.all(paths.map(p => this.get(p)))` → Record
- `batchSet`: `Promise.all(Object.entries(entries).map(([p,c]) => this.set(p,c)))`

## Edge Cases
- Non-browser environment: `typeof localStorage === 'undefined'` → throw `IOError('localStorage not available')`
- Path without leading `/`: normalize in `key()`
- `list()` with no prefix: return all `afs:` keys

## Dependencies
- `../types.js` — `StorageBackend`
- `../errors.js` — `IOError`

## Test Cases
- `set('/a', 'x')` then `get('/a')` returns `'x'`
- `get('/missing')` returns `null`
- `delete('/a')` then `get('/a')` returns `null`
- `list()` returns paths with leading `/`
- `list('/dir')` filters correctly
- `scan('foo')` returns matching lines with correct path/line/content
- `batchGet`/`batchSet` round-trip
