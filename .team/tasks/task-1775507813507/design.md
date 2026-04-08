# Task Design: store.js - 导出delete()方法别名

## Files to Modify
- `src/store/index.js`

## Problem
`store.delete(key)` is not exported; only `del(key)` exists. DBB requires both.

## Change
Add a named export `deleteKey` aliased to `del`, and export `delete` as an alias.

Since `delete` is a reserved word in JS, export it as a property via re-export pattern:

```js
export const delete_ = del;  // won't work as 'delete'
```

The cleanest approach: export a wrapper function named with the alias using object export at bottom, but since ES modules don't allow `export { del as delete }` (reserved word), expose via a default-style named export in the module's public API by adding:

```js
export { del as delete };  // SyntaxError in strict ES modules
```

**Correct approach**: Export an object or use CommonJS-compatible alias. Since the DBB test calls `store.delete(key)` on the module namespace object, use:

```js
// At bottom of src/store/index.js
export { del as delete };
```

Node.js ESM does allow `export { del as delete }` — `delete` as an export name (not identifier) is valid per spec.

## Final Addition to src/store/index.js
```js
export { del as delete };
```

## Test Cases
- `import { delete as storeDelete } from './src/store/index.js'` — valid
- `storeDelete('foo')` removes key; subsequent `get('foo')` returns null
- `del('bar')` still works unchanged
