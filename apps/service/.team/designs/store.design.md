# Module Design: Store（KV 存储）

**ARCHITECTURE.md Section:** Store (currently undocumented — see task-1775849914280 item #1)
**Status:** draft

## Overview

The Store module wraps `agentic-store` to provide a JSON-serialized KV store backed by SQLite. Single file: `src/store/index.js`.

## Verified Exports (src/store/index.js)

```javascript
export async function get(key)          // line 13 — returns parsed JSON or null
export async function set(key, value)   // line 19 — JSON.stringify before write
export async function del(key)          // line 24 — delete by key
export { del as delete }                // line 29 — alias
```

## Internal Data Flow

```
get(key) → getStore() → store.get(key) → JSON.parse(val)
set(key, value) → getStore() → store.set(key, JSON.stringify(value))
del(key) → getStore() → store.delete(key)
```

### Lazy Initialization

```javascript
const DB_PATH = join(homedir(), '.agentic-service', 'store.db')
let _store = null

async function getStore() {
  if (!_store) _store = await open(DB_PATH)  // agentic-store.open()
  return _store
}
```

- `_store` is module-level singleton — first call to any export triggers `open()`
- No explicit `close()` — store lives for process lifetime

## External Dependencies

| Import | From | Verified |
|--------|------|----------|
| `open` | `agentic-store` | ✅ named import, workspace:* |

## Error Handling

- `get()` returns `null` for missing keys (agentic-store returns null/undefined)
- `JSON.parse` can throw on corrupted data — NOT caught (caller responsibility)
- `open()` failure propagates — no retry logic

## Consumers

- `src/runtime/memory.js` — uses `get/set/del` for memory index + entries (key prefix `mem:`)
- `src/server/brain.js` — indirect via memory.js

## Constraints

- DB path hardcoded to `~/.agentic-service/store.db`
- All values are JSON-serialized strings — binary data not supported
- No TTL, no namespacing, no batch operations
- Thread-safe only if agentic-store's SQLite driver handles concurrent access
