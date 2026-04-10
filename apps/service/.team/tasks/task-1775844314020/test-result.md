# Test Result: Fix embed.js build failure

**Task:** task-1775844314020
**Status:** FAIL
**Test file:** test/m98-embed-build-fix.test.js

## Results

| Test | Result |
|------|--------|
| calls localEmbed with an array argument | ❌ FAIL |
| destructures the first result from localEmbed | ❌ FAIL |
| does NOT pass a bare string to localEmbed | ❌ FAIL |
| src/index.js exports embed | ✅ PASS |

**Total: 1/4 passed, 3/4 failed**

## Root Cause

The fix described in design.md was **never applied** to `src/runtime/embed.js`. The file still contains the original broken code:

```javascript
import agenticEmbedPkg from 'agentic-embed'
const { localEmbed: agenticEmbed } = agenticEmbedPkg

export async function embed(text) {
  if (typeof text !== 'string') throw new TypeError('text must be a string')
  if (text === '') return []
  return agenticEmbed(text)  // ← BUG: passes string, localEmbed expects string[]
}
```

Expected fix (from design.md):
```javascript
const { localEmbed } = agenticEmbedPkg
// ...
const [vector] = localEmbed([text])  // wrap in array, destructure result
return vector
```

## Impact

- P0 build failure: `TypeError: texts.map is not a function` at runtime
- Package entry point (src/index.js → embed.js) will fail when actually loaded
- Tests pass only because they mock agentic-embed

## Action Required

Developer must apply the fix from design.md to src/runtime/embed.js.
