# Design: Wire agentic-store as external package

## Files to modify
- `package.json` — add `"agentic-store"` to dependencies
- `src/store/index.js` — verify imports from `'agentic-store'` (not a local stub)

## Steps
1. Check `package.json` dependencies for `agentic-store`; if missing, add `"agentic-store": "*"`
2. Read `src/store/index.js`; confirm top-level import is `from 'agentic-store'`
3. If a local stub exists (e.g. `src/store/stub.js` or inline implementation), remove it and replace with the external import

## Expected interface (from agentic-store)
```js
import { get, set, del } from 'agentic-store';
// get(key) → Promise<any>
// set(key, value) → Promise<void>
// del(key) → Promise<void>
```

## Edge cases
- If `src/store/index.js` doesn't exist, create it with the import above
- Do not add a local fallback — the external package is required

## Test cases
- `get`/`set`/`del` resolve without throwing when package is installed
