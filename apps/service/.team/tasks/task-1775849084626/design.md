# Task Design: Fix m21-profiles.test.js — loadBuiltinProfiles fails under fs mock

Task: task-1775849084626
Module: Detector (ARCHITECTURE.md §1)
Module Design: `.team/designs/detector.design.md`

## Problem

Two tests in `test/m21-profiles.test.js` (DBB-001 and DBB-002) were failing with `Error: No matching profile found` because `loadBuiltinProfiles()` returned `{ profiles: [] }` when `fs/promises` was mocked.

### Root Cause

`loadBuiltinProfiles()` (`src/detector/profiles.js:109-117`) uses:
```javascript
const builtinPath = new URL('../../profiles/default.json', import.meta.url);
const content = await fs.readFile(builtinPath, 'utf-8');
```

The `new URL()` produces a `file://` URL object. The test mocks in DBB-001 and DBB-002 used `vi.doMock('fs/promises')` to intercept `readFile` calls. The mock's `readFile` function receives the URL object and must correctly delegate non-cache reads to `actual.readFile`.

- DBB-001 mock: checks `String(filePath).includes('.agentic-service')` — URL objects stringify to `file:///...` which doesn't contain `.agentic-service`, so it correctly falls through to `actual.readFile`
- DBB-002 mock: checks `filePath === CACHE_FILE` — a URL object never `===` a string, so it correctly falls through to `actual.readFile`

The fix was ensuring the mock properly spreads `actual` and delegates non-cache `readFile` calls with the original arguments, including URL objects.

## Files Involved

- `test/m21-profiles.test.js` — the test file (modified)
- `src/detector/profiles.js` — source under test (read-only, not modified)
- `src/detector/matcher.js` — `matchProfile()` called by `getProfile()` (read-only)
- `profiles/default.json` — built-in profiles loaded by `loadBuiltinProfiles()` (read-only)

## Implementation Plan

1. In DBB-001 mock: ensure `readFile` mock uses `String(filePath).includes('.agentic-service')` to detect cache paths, and delegates all other calls (including URL objects) to `actual.readFile(filePath, ...args)`
2. In DBB-002 mock: change `filePath === CACHE_FILE` to `String(filePath).includes('.agentic-service')` so it catches cache reads regardless of whether the path is a string or URL, while still passing through `loadBuiltinProfiles()`'s URL-based reads to the real `readFile`
3. Both mocks must include `mkdir: actual.mkdir` to prevent `saveCache` errors

## Test Cases

- DBB-001: `getProfile()` returns object with `llm`, `stt`, `tts`, `fallback` keys for valid Apple Silicon hardware
- DBB-002: `getProfile()` returns object with `llm` key when network fails and no cache exists (falls through to built-in default)

## Verification

```bash
npx vitest run test/m21-profiles.test.js
```

Both tests should pass. Verified: ✅ 2 passed (2026-04-11).

## ⚠️ Unverified Assumptions

None — all paths, signatures, and behavior verified from source.
