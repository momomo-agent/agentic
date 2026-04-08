# Design: Implement typed error classes

## Files to Create/Modify
- `src/errors.ts` — new file with error classes
- `src/types.ts` — re-export error types
- `src/filesystem.ts` — throw typed errors instead of returning string errors

## src/errors.ts (new)
```ts
export class NotFoundError extends Error {
  constructor(path: string) { super(`Not found: ${path}`); this.name = 'NotFoundError' }
}
export class PermissionDeniedError extends Error {
  constructor(msg = 'Permission denied') { super(msg); this.name = 'PermissionDeniedError' }
}
export class IOError extends Error {
  constructor(msg: string) { super(msg); this.name = 'IOError' }
}
```

## src/filesystem.ts changes
- `read()`: when `storage.get()` returns `null`, throw `NotFoundError(path)` (or return `{path, error}` wrapping it — keep existing `FileResult` shape but set `error` to the typed error message)
- `write()` when `readOnly`: throw `PermissionDeniedError()` (or return `{path, error}`)
- Wrap `storage.*` calls: catch unknown errors and re-throw as `IOError`

> Note: `filesystem.ts` currently returns `FileResult` with `error` string rather than throwing. Keep that contract — catch typed errors and put `err.message` in `error` field. This avoids breaking callers.

## src/types.ts
Add re-export:
```ts
export { NotFoundError, PermissionDeniedError, IOError } from './errors.js'
```

## Edge Cases
- Backends that return `null` from `get()` should trigger `NotFoundError` in `filesystem.ts`, not in the backend itself
- IOError wraps unexpected throws from any backend method

## Test Cases
- `read("/missing")` → `result.error` contains "Not found"
- `write()` on readOnly fs → `result.error` contains "Permission denied"
- Consumers can `import { NotFoundError } from 'agentic-filesystem'` and do `instanceof` checks
