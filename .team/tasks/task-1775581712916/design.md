# Design: Fix stale agentic-sense mocks and test bugs

## Files to modify
- `test/m87-sense-pipeline.test.js`
- `test/m84-sense-external-package.test.js`
- `test/m77-sense-imports.test.js`

## Changes

### m87-sense-pipeline.test.js
Mock already correct (`AgenticSense` with `detect()`). Issue: `createPipeline()` in `adapters/sense.js` calls `await instance.init()` but mock doesn't have `init()`.

Fix mock to add `init: vi.fn().mockResolvedValue(undefined)`:
```js
vi.mock('agentic-sense', () => ({
  AgenticSense: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    detect: vi.fn().mockReturnValue({ faces: [...], gestures: [...], objects: [...] }),
  })),
}));
```

### m84-sense-external-package.test.js
Test calls `initHeadless()` then `detect()`. `initHeadless()` calls `createPipeline()` which calls `await instance.init()`. Mock needs `init()`.

Add `init: vi.fn().mockResolvedValue(undefined)` to the `AgenticSense` mock at top of file.

### m77-sense-imports.test.js
Line: `ok('agentic-sense key starts with # (Node.js spec)', src.includes('agentic-sense'));`
This passes if `src` contains `agentic-sense` (which it does). No fix needed here — assertion is correct.

Check actual failure: test imports `../src/runtime/sense.js` at runtime. If `agentic-sense` package not resolvable, import fails. Ensure `package.json` has `agentic-sense` in dependencies pointing to vendor tgz.

## Edge cases
- If `vi.mock` hoisting causes issues with async `init`, use `mockResolvedValue(undefined)` not `mockReturnValue(undefined)`
- Tests that `await import(...)` after `vi.mock` need cache cleared with `vi.resetModules()` in `beforeEach` if re-importing

## Test cases to verify
- `npm test test/m87-sense-pipeline.test.js` — all 4 tests pass
- `npm test test/m84-sense-external-package.test.js` — all 5 tests pass
- `npm test test/m77-sense-imports.test.js` — all assertions pass
