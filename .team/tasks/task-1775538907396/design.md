# Design: Add agentic-store to package.json dependencies

## File to Modify
- `package.json`

## Change
Add `"agentic-store": "*"` to the `dependencies` section.

```json
"dependencies": {
  ...
  "agentic-store": "*"
}
```

## Why
`src/store/index.js` already imports from `'agentic-store'` but the package is not declared in `package.json`, causing install-time and test-time resolution failures.

## Edge Cases
- No code changes needed — declaration only.
- Version `"*"` matches whatever is available locally/in the monorepo.

## Test Verification
- `task-1775536619023` test: `get()`, `set()`, `del()` resolve via the external package without import errors.
