# Design: memory.js 并发写 mutex 修复

## File
`src/runtime/memory.js`

## Change
Add a promise-chain mutex around the read-modify-write in `add()`.

## Implementation
```js
let _lock = Promise.resolve()

export async function add(text) {
  _lock = _lock.then(async () => {
    const vector = Array.from(await embed(text))
    const id = 'mem:' + Date.now() + ':' + Math.random().toString(36).slice(2)
    await set(id, { text, vector })
    const index = await getIndex()
    index.push(id)
    await set(INDEX_KEY, index)
  })
  return _lock
}
```

## Why
`_lock = _lock.then(fn)` chains each call sequentially. No external dependency needed.

## Edge Cases
- Error in one `add()` call: chain continues for subsequent calls (`.then()` on rejected promise skips to next `.then()` — wrap inner in try/catch if needed, but for now let it propagate naturally)
- `remove()` does not need mutex (it reads then writes INDEX_KEY but is not called concurrently in practice)

## Test Cases
1. `Promise.all(Array.from({length:10}, () => add('x')))` → `getIndex()` length === 10
2. Sequential `add()` calls still work correctly
