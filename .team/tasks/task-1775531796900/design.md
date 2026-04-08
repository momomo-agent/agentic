# Design: Wire agentic-embed in runtime/embed.js

## Files
- `src/runtime/embed.js` — already correct, no changes needed
- `package.json` — add `agentic-embed` to dependencies and imports map
- `src/runtime/adapters/embed.js` — create adapter stub

## Changes

### package.json dependencies
```json
"agentic-embed": "*"
```

### package.json imports map
```json
"agentic-embed": "./src/runtime/adapters/embed.js"
```

### src/runtime/adapters/embed.js (new file)
```js
export async function embed(text) {
  throw new Error('agentic-embed: not implemented');
}
```

## Edge Cases
- Empty string: `embed.js` returns `[]` before calling adapter
- Non-string: throws `TypeError` before calling adapter
- Adapter error: propagates to caller

## Test Cases
- `embed('')` → `[]`
- `embed(42)` → throws `TypeError`
- `embed('hello')` → calls adapter
