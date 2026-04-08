# Task Design — Fix agentic-core Symlink and Broken Tests

## Problem

`package.json` has `"agentic-core": "link:../agentic-core"` which resolves to the standalone project at `~/LOCAL/momo-agent/projects/agentic-core/` — a completely different package with different exports (e.g., no `createProvider`, no `runAgentLoop`).

This causes 33 test failures because:
- `src/providers/provider.ts` and `src/providers/index.ts` are re-export shims from `agentic-core`
- Tests importing from `../src/providers/provider.js` or `../src/providers/index.js` get `undefined` exports
- `src/ask.ts` imports directly from `agentic-core` — also broken

## Fix

### Step 1: Fix symlink in package.json

**File:** `package.json` (line 41)

Change:
```json
"agentic-core": "link:../agentic-core"
```
To:
```json
"agentic-core": "link:./packages/agentic-core"
```

### Step 2: Reinstall dependencies

```bash
pnpm install
```

This re-links `agentic-core` to the local `packages/agentic-core/` which has the correct exports.

### Step 3: Verify tests pass

```bash
npx vitest --run
```

All 174 tests should pass (141 currently passing + 33 failing → all passing).

## Why This Fixes All 33 Failures

The 33 failing tests fall into two categories:

**Category A — Tests importing `createProvider` from shims (most failures):**
- `test/task-1775530933189-provider.test.ts` — imports from `../src/providers/provider.js`
- `test/custom-provider-baseurl.test.ts` — imports from `../src/providers/provider.js`
- `test/m23-apikey-optional.test.ts` — imports from `../src/providers/index.js`
- `test/m2-provider-apikey.test.ts` — likely similar
- `test/m21-apikey-optional.test.ts` — likely similar
- `test/custom-provider.test.ts` — likely similar

Both `src/providers/provider.ts` and `src/providers/index.ts` re-export from `agentic-core`:
```typescript
export { createProvider, createAnthropicProvider, createOpenAIProvider } from 'agentic-core'
```
With the broken symlink, `agentic-core` resolves to the standalone project which doesn't export these. Fixing the symlink makes these re-exports work.

**Category B — Tests importing types from shims + loop tests:**
- `test/ask-loop.test.ts` — imports `Provider`, `ProviderResponse` from `../src/providers/index.js`
- `test/ask-images.test.ts` — imports `Provider` from `../src/providers/index.js`
- `test/ask-system-prompt.test.ts` — similar
- `test/ask-system-prompt-multiround.test.ts` — similar

These type imports also go through the shim re-exports from `agentic-core`.

## Dependencies

- `packages/agentic-core/` must already be built (`dist/` must exist with valid exports)
- Currently confirmed: `packages/agentic-core/dist/` exists

## Edge Cases

- If `packages/agentic-core/dist/` is stale, run `cd packages/agentic-core && npm run build` before `pnpm install`
- The `ProviderConfig` interface in agentic-core doesn't have a `tools` field, but tests cast to `any` so this is not an issue

## Verification

```bash
# 1. Fix symlink
# (edit package.json)

# 2. Reinstall
pnpm install

# 3. Run tests
npx vitest --run
# Expected: Tests  174 passed (174)
```
