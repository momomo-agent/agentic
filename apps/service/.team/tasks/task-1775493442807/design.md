# Task Design: KV 存储抽象

## File
- `src/store/index.js` (create)

## Function Signatures

```js
// get(key: string) → Promise<any | null>
export async function get(key) {}

// set(key: string, value: any) → Promise<void>
export async function set(key, value) {}

// delete(key: string) → Promise<void>
export async function del(key) {}
```

## Logic

1. Import `agentic-store` SQLite backend
2. Initialize store lazily on first call (singleton pattern)
3. Store path: `~/.agentic-service/store.db`
4. `set`: serialize value as JSON, write to SQLite
5. `get`: read from SQLite, parse JSON; return `null` if not found
6. `del`: remove key; no-op if key doesn't exist

## Initialization

```js
let _store = null
async function getStore() {
  if (!_store) _store = await agenticStore.open(DB_PATH)
  return _store
}
```

## Error Handling

- `get` on missing key → return `null` (no throw)
- `del` on missing key → no-op (no throw)
- DB open failure → propagate error

## Test Cases (DBB-003, DBB-004, DBB-005)

```js
await set("key", "value")
assert(await get("key") === "value")  // DBB-003

await set("k", "v"); await del("k")
assert(await get("k") == null)  // DBB-004

assert(await get("nonexistent") == null)  // DBB-005
```

## Dependencies

- `agentic-store` package (must be in package.json)
- `os` (for home dir path)
