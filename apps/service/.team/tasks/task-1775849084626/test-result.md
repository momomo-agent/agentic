# Test Result: task-1775849084626

## Fix m21-profiles.test.js — loadBuiltinProfiles fails under fs mock

### Test Run

- **Date**: 2026-04-11
- **Runner**: vitest 2.1.9
- **File**: test/m21-profiles.test.js

### Results

| Test | Status |
|------|--------|
| DBB-001: getProfile returns llm/stt/tts/fallback for valid hardware | ✅ PASS |
| DBB-002: getProfile falls back to built-in default when network unavailable and no cache | ✅ PASS |

**Total: 2 passed, 0 failed**

### Regression Check

Ran all profiles-related test files to verify no regressions:

- test/m19-profiles.test.js — 1 test, all passed
- test/m19-profiles-cdn.test.js — 6 tests, all passed
- test/m20-profiles.test.js — 6 tests, all passed
- test/m20-profiles-default.test.js — 1 test, all passed
- test/m21-profiles.test.js — 2 tests, all passed

**Regression total: 16 passed, 0 failed**

### Edge Cases

- The fs mock in DBB-001 correctly passes through non-cache file reads (including `file://` URL objects from `loadBuiltinProfiles`)
- The fs mock in DBB-002 correctly only blocks CACHE_FILE reads, allowing builtin profile loading to work

### Verdict

Fix is verified. Both previously-failing tests now pass, and no regressions detected in related test suites.
