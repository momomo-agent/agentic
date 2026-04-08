# Design: Replace local src/store/index.js with agentic-store package

## Analysis

`src/store/index.js` already imports from `agentic-store` package — it is NOT a local stub. It wraps `agentic-store`'s `open()` with a singleton pattern and JSON serialization.

This task verifies `agentic-store` is listed as a dependency in `package.json` and the import resolves.

## Files to Modify

- `package.json` — add `"agentic-store": "*"` to `dependencies` if missing

## Verification

```bash
node -e "import('./src/store/index.js').then(() => console.log('ok'))"
```

## Edge Cases

- If `agentic-store` is not in `node_modules`, install fails at startup — must be in `dependencies`
