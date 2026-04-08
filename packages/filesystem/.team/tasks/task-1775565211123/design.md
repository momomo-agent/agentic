# Design: Implement automatic backend selection

## File to modify
- `src/index.ts` — add `createDefaultBackend` as a named alias export for the existing `createBackend`

## Approach
`createBackend()` already implements the full auto-selection logic (Node.js → OPFS → AgenticStore → Memory). The DBB requires a function named `createDefaultBackend()`. The simplest correct fix is to export it as an alias.

## Change

```ts
// src/index.ts — add after existing createBackend export
export const createDefaultBackend = createBackend
```

## Test file to modify
- `test/create-backend.test.js` — add tests for `createDefaultBackend`

```js
import { createDefaultBackend, NodeFsBackend } from '../dist/index.js'

test('createDefaultBackend() returns NodeFsBackend in Node.js', async () => {
  const backend = await createDefaultBackend()
  assert.ok(backend instanceof NodeFsBackend)
})

test('createDefaultBackend() is exported from package', async () => {
  const { createDefaultBackend: fn } = await import('../dist/index.js')
  assert.strictEqual(typeof fn, 'function')
})
```

## Edge cases
- No new logic needed — `createBackend` already handles all three environments
- OPFS fallback path is browser-only; Node.js tests only verify the NodeFs branch (DBB-004)
- Memory fallback (DBB-006) is covered by the existing logic when neither Node nor OPFS is available

## Dependencies
- `createBackend` must remain exported (existing tests depend on it)

## Test cases to verify (DBB)
- DBB-004: `createDefaultBackend()` returns `NodeFsBackend` in Node.js
- DBB-005: OPFS branch covered by existing `createBackend` logic (browser-only, not testable in Node)
- DBB-006: Memory fallback covered by existing `createBackend` logic
