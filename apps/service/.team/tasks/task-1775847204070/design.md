# Task Design: Remove #agentic-embed dead import map

**Task:** task-1775847204070
**Module:** Config / Package (ARCHITECTURE.md: 依赖关系)
**Module Design:** N/A — package.json metadata, no module-level design needed

## Problem

`package.json` line 42-44 has a dead Node.js import map:

```json
"imports": {
  "#agentic-embed": "./src/runtime/adapters/embed.js"
}
```

No source file in `src/` references `#agentic-embed`. The actual embed path is `import { localEmbed } from 'agentic-embed'` in `src/runtime/embed.js`. The `#agentic-voice` entry was already removed in commit e699e630.

## Verified Facts

- `grep -r '#agentic-embed' src/` → 0 matches
- `src/runtime/embed.js` imports from `'agentic-embed'` (the workspace package), not the import map
- `src/runtime/adapters/embed.js` is a stub that throws `'not implemented'` — dead code
- Test `test/m98-dead-imports.test.js` line 27-29 currently asserts `#agentic-embed` IS present (documents current state)

## Implementation Plan

### Step 1: Edit `package.json`

Remove the entire `"imports"` block (lines 42-44):

```diff
-  "imports": {
-    "#agentic-embed": "./src/runtime/adapters/embed.js"
-  },
```

### Step 2: Update test

Edit `test/m98-dead-imports.test.js` — change line 27-29 from:

```javascript
it('package.json still has #agentic-embed in imports', () => {
  expect(imports).toHaveProperty('#agentic-embed')
})
```

to:

```javascript
it('package.json does NOT have #agentic-embed in imports', () => {
  expect(imports).not.toHaveProperty('#agentic-embed')
})
```

### Step 3: Verify

```bash
npx vitest run test/m98-dead-imports.test.js
```

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Remove `"imports"` block |
| `test/m98-dead-imports.test.js` | Flip assertion from `toHaveProperty` to `not.toHaveProperty` |

## Test Cases

1. `npx vitest run test/m98-dead-imports.test.js` — all pass
2. `grep -r '#agentic-embed' src/` — still 0 matches (no regression)
3. `npx vitest run` — full suite passes (no import breakage)

## ⚠️ Unverified Assumptions

None — all facts verified from source.
