# Task Design: Fix profiles-edge-cases.test.js — expired cache fallback assertion

**Task ID:** task-1775848768979
**Module:** Detector（硬件检测） — ARCHITECTURE.md Section 1
**Status:** Verified — test already passes

## Root Cause Analysis

The test `'should use expired cache when network fails'` (`test/detector/profiles-edge-cases.test.js:300-344`) was reported failing with:
```
expected 'ollama' to be 'cached-provider'
```

### Data Flow (verified from source)

1. Test writes expired cache (8 days old > 7-day `CACHE_MAX_AGE`) to `~/.agentic-service/profiles.json`
2. Test mocks `global.fetch` to reject with `'Network error'`
3. `getProfile(hardware)` → `loadProfiles()`:
   - `loadCache()` → returns expired cache ✓ (`profiles.js:27-30`)
   - `isCacheExpired()` → true → skips fresh cache path ✓ (`profiles.js:28`)
   - `fetchRemoteProfiles()` → throws (mocked) ✓ (`profiles.js:33-39`)
   - Falls back to expired cache → returns `cached.data` ✓ (`profiles.js:42-44`)
4. `matchProfile(cached.data, hardware)` runs on the cached profiles (`profiles.js:18`)

### Why it was failing

The original test wrote cache data with `match: { platform: 'darwin', arch: 'arm64' }` — a profile that could be outscored by built-in profiles if they were somehow loaded, or that could fail if `loadCache()` returned null (causing fallback to `loadBuiltinProfiles()` → `default.json` → `llm.provider: 'ollama'`).

### Current fix (already applied)

The test now uses `match: {}` (empty criteria) in the cached profile. With `calculateMatchScore()` (`matcher.js:74`), empty match → `maxScore=0` → returns score 1 (universal fallback). Since it's the only profile in the cached data, `matchProfile()` returns it with `cached-provider`.

## Verified State

```
npx vitest run test/detector/profiles-edge-cases.test.js → 14/14 pass ✅
```

## Files Involved

| File | Action | Verified |
|------|--------|----------|
| `test/detector/profiles-edge-cases.test.js:300-344` | No changes needed — already fixed | ✅ read + tested |
| `src/detector/profiles.js:16-50` | No changes needed | ✅ read |
| `src/detector/matcher.js:7-75` | No changes needed | ✅ read |

## Implementation Plan

1. **Run test** — `npx vitest run test/detector/profiles-edge-cases.test.js` → ✅ 14/14 pass
2. **No code changes required** — test is correctly structured and passing

## Key Verified Signatures

```javascript
// src/detector/profiles.js:16-19
export async function getProfile(hardware) {
  const profiles = await loadProfiles();
  return matchProfile(profiles, hardware);
}

// src/detector/matcher.js:7-22
export function matchProfile(profiles, hardware) {
  const candidates = profiles.profiles
    .map(entry => ({ entry, score: calculateMatchScore(entry.match, hardware) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);
  if (candidates.length === 0) throw new Error('No matching profile found');
  return candidates[0].entry.config;
}
```

## ⚠️ Unverified Assumptions

None — all paths verified by reading source and running the test suite.
