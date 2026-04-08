# Design: Replace local src/runtime/embed.js with agentic-embed package

## Analysis

`src/runtime/embed.js` already imports from `agentic-embed` — it is NOT a local stub. It wraps `agentic-embed`'s `embed()` with input validation.

This task verifies `agentic-embed` is listed as a dependency in `package.json` and the import resolves.

## Files to Modify

- `package.json` — add `"agentic-embed": "*"` to `dependencies` if missing

## Verification

```bash
node -e "import('./src/runtime/embed.js').then(() => console.log('ok'))"
```

## Edge Cases

- Empty string input returns `[]` (already handled)
- Non-string input throws `TypeError` (already handled)
