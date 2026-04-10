# Design: Remove dead import maps from package.json

## Module
Config / package.json (project root configuration)

## ⚠️ Task Description Correction

The task says "no source file references them" and to "remove the entire `imports` block." This is **partially incorrect**:

- `#agentic-voice` — truly dead. No source or test file imports it.
- `#agentic-embed` — **actively used**:
  - `vitest.config.js:7` — alias for `#agentic-embed` → `./src/runtime/adapters/embed.js`
  - `test/m76-embed-wiring.test.js:32` — `import('#agentic-embed')` in a test assertion
  - `test/m76-embed-wiring.test.js:14-15` — test verifies the import map exists in package.json

**Removing the entire `imports` block would break tests.**

## Verified Current State

```json
// package.json "imports" block
{
  "#agentic-embed": "./src/runtime/adapters/embed.js",
  "#agentic-voice": "./src/runtime/adapters/voice/openai-tts.js"
}
```

## Implementation Plan

### Option A (Recommended): Remove only `#agentic-voice`

1. Edit `package.json`: remove the `#agentic-voice` entry from the `imports` object, keep `#agentic-embed`
2. No other files need changes — nothing references `#agentic-voice`
3. Run `vitest --run` to confirm no regressions

### Option B: Remove entire `imports` block (as task describes)

Would require also:
1. Remove `#agentic-embed` alias from `vitest.config.js`
2. Update `test/m76-embed-wiring.test.js` — remove or rewrite the import map test (lines 13-16) and the dynamic import test (lines 31-34)
3. Higher risk, more churn, and removes a valid wiring test

## Recommendation

Go with **Option A**. It fixes the actual dead code without breaking tests or removing valid infrastructure.

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Remove `"#agentic-voice"` key from `imports` object |

## Test Cases

- `vitest --run` passes (especially `m76-embed-wiring.test.js`)
- `#agentic-embed` import map still present in package.json
- `#agentic-voice` no longer in package.json
