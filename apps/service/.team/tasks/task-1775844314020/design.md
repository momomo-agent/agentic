# Task Design: Fix embed.js build failure

**Task:** task-1775844314020
**Module:** Runtime（服务运行时） — src/runtime/embed.js
**ARCHITECTURE.md Section:** 3. Runtime — Embed

## Root Cause

The build failure has TWO issues, not one:

### Issue 1: Import works but runtime call fails
The current code:
```javascript
import agenticEmbedPkg from 'agentic-embed'
const { localEmbed: agenticEmbed } = agenticEmbedPkg
```
This import pattern is correct for a CJS default import in ESM. The import itself succeeds.

### Issue 2: `localEmbed` signature mismatch
`localEmbed` in agentic-embed expects an **array of strings**, not a single string:
```javascript
function localEmbed(texts, vocabSize = 512) {
    const allTokens = texts.map(t => tokenize(t))  // ← texts.map fails on a string
    ...
}
```

The current `embed()` wrapper passes a single string:
```javascript
export async function embed(text) {
  return agenticEmbed(text)  // ← passes string, localEmbed expects string[]
}
```

This causes: `TypeError: texts.map is not a function`

## Verified Facts

- **agentic-embed location:** `/Users/kenefe/LOCAL/momo-agent/projects/agentic/packages/embed/`
- **Module format:** UMD (no `"type": "module"`, `"main": "agentic-embed.js"`)
- **Exports:** `{ create, chunkText, cosineSimilarity, localEmbed }` as default export
- **`localEmbed` signature:** `localEmbed(texts: string[], vocabSize?: number) → number[][]`
  - Returns array of embedding vectors (one per input text)
- **Callers of `embed()`:**
  - `src/index.js` line 10: `export { embed } from './runtime/embed.js'` (re-export)
  - No other source files call `embed()` directly (memory.js does not exist yet)
- **Tests:** All 845 tests pass because they mock `agentic-embed` — the real module is never loaded in tests

## Fix

### File: `src/runtime/embed.js`

Change from:
```javascript
import agenticEmbedPkg from 'agentic-embed'
const { localEmbed: agenticEmbed } = agenticEmbedPkg

export async function embed(text) {
  if (typeof text !== 'string') throw new TypeError('text must be a string')
  if (text === '') return []
  return agenticEmbed(text)
}
```

Change to:
```javascript
import agenticEmbedPkg from 'agentic-embed'
const { localEmbed } = agenticEmbedPkg

export async function embed(text) {
  if (typeof text !== 'string') throw new TypeError('text must be a string')
  if (text === '') return []
  const [vector] = localEmbed([text])
  return vector
}
```

Key changes:
1. Rename destructured var to `localEmbed` (clearer)
2. Wrap `text` in array: `localEmbed([text])` — matches expected `string[]` signature
3. Destructure first result: `const [vector] = ...` — returns single vector, not array-of-arrays

### Return type contract
- `embed(text: string) → Promise<number[]>` — single embedding vector
- `embed('') → Promise<[]>` — empty array for empty string
- `embed(nonString) → throws TypeError`

## Test Cases

1. **Import succeeds:** `node --input-type=module -e "import { embed } from './src/runtime/embed.js'"` → exit 0
2. **Runtime call succeeds:** `embed('hello')` → returns `number[]` (not `TypeError`)
3. **Empty string:** `embed('')` → returns `[]`
4. **Non-string:** `embed(123)` → throws `TypeError`
5. **Package entry point:** `node --input-type=module -e "import { embed } from './src/index.js'"` → exit 0

## DBB Verification

This fix addresses DBB-001 and DBB-002 from `.team/milestones/m98/dbb.md`:
- DBB-001: `src/index.js` exports include `embed` — must not throw on import
- DBB-002: `require('./src/index.js')` must exit cleanly

## ⚠️ Unverified Assumptions

None — all facts verified against actual source code and runtime behavior.
