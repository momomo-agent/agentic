# Test Results: CDN Fallback & agentic-store Integration

**Task:** task-1775587524443
**Tester:** tester-2
**Date:** 2026-04-08

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 46 |
| Passed | 43 |
| Failed | 3 |
| Pass Rate | 93.5% |
| Test Files | 12 |

## Part 1: CDN Fallback Verification

### 4-Tier Fallback Chain

| Tier | Mechanism | Status | Evidence |
|------|-----------|--------|----------|
| Tier 1 | Fresh cache (~/.agentic-service/profiles.json, 7-day TTL) | ✅ PASS | m28-profiles-cache.test.js (5/5) |
| Tier 2 | Remote fetch (PROFILES_URL, 5s timeout) | ✅ PASS | m19-profiles-cdn.test.js, m30-cdn-profiles.test.js |
| Tier 3 | Expired cache fallback | ✅ PASS | m28-profiles-cache.test.js - "uses expired cache as fallback" |
| Tier 4 | Built-in profiles/default.json | ✅ PASS | profiles-edge-cases.test.js - cache/network tests |

### Additional CDN Tests
- `test/detector/profiles-cdn.test.js` — PASS
- `test/detector/hot-reload.test.js` — PASS (6 sub-tests: watchProfiles function, stop function, onReload callback, 304 handling, network error safety, stop cancels polling)

### Edge Cases Verified
- ✅ Network timeout (5s AbortSignal) → falls back to cache/builtin
- ✅ PROFILES_URL env var override → uses custom CDN URL
- ✅ ETag-based conditional fetch (If-None-Match header)
- ✅ watchProfiles() returns cleanup function
- ✅ Malformed/missing cache → falls through to next tier gracefully

### 3 Pre-existing Failures (NOT CDN fallback issues)
These failures are due to test expectations not matching the current built-in `profiles/default.json`:
1. `profiles.test.js:33` — expects default fallback provider='openai', but default.json has provider='ollama'
2. `profiles-edge-cases.test.js:51` — same mismatch for low-memory fallback
3. `profiles-edge-cases.test.js:239` — same mismatch for low-memory systems

**Root cause:** Tests were written when the default profile used 'openai', but `profiles/default.json` was later updated to use 'ollama' as the default provider. The CDN fallback mechanism itself works correctly — it properly falls through all tiers and returns the built-in default.

## Part 2: agentic-store Integration

| Check | Status | Evidence |
|-------|--------|----------|
| agentic-store in package.json | ✅ PASS | `file:./vendor/agentic-store.tgz` |
| src/store/index.js imports agentic-store | ✅ PASS | `import { open } from 'agentic-store'` |
| init() creates store without error | ✅ PASS | store/index.test.js (5/5) |
| get/set/del operations | ✅ PASS | store/index.test.js |
| Singleton pattern | ✅ PASS | m84-agentic-store-wiring.test.js (4/4) |
| Export structure (del as delete) | ✅ PASS | m77-store-wiring.test.js (2/2) |
| Dependency check | ✅ PASS | m64-agentic-store.test.js (2/2) |

### Memory Integration
- `test/runtime/memory.test.js` — PASS (5/5: add, search, remove, cosine similarity)
- `test/runtime/memory-mutex-m10.test.js` — PASS (3/3: mutex concurrency)

## DBB Criteria Assessment

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Fresh cache tier works | ✅ |
| 2 | Remote fetch works (PROFILES_URL, 5s timeout) | ✅ |
| 3 | Expired cache fallback works | ✅ |
| 4 | Built-in fallback (profiles/default.json) | ✅ |
| 5 | Unreachable URL → valid profile, no crash | ✅ |
| 6 | m19-profiles-cdn.test.js passes | ✅ |
| 7 | m30-cdn-profiles.test.js passes | ✅ |
| 8 | agentic-store imports correctly | ✅ |
| 9 | init() works without error | ✅ |
| 10 | query()/get() returns results | ✅ |
| 11 | m64-agentic-store.test.js passes | ✅ |
| 12 | No import resolution errors | ✅ |

## Conclusion

Both CDN fallback and agentic-store integration are **verified working**. The 4-tier fallback chain functions correctly across all tiers, and the agentic-store wrapper provides reliable get/set/del operations. The 3 failing tests are pre-existing expectation mismatches (tests expect 'openai' default, but built-in profiles now default to 'ollama') — these do not indicate functional issues with the CDN or store systems.
