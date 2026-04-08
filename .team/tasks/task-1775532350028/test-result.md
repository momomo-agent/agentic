# Test Result: CDN Profiles 7-day Cache Staleness

## Summary
- **Status**: PASSED
- **Tests**: 5 passed, 0 failed

## Results

| Test | Result |
|------|--------|
| Calls fetch when cache older than 7 days | PASS |
| Does not fetch when cache within 7 days | PASS |
| Falls back to builtin when fetch fails and no cache | PASS |
| Uses expired cache as fallback when fetch fails | PASS |
| CACHE_MAX_AGE_MS = 7 days constant present | PASS |

## Edge Cases
- No internet: uses stale cache or bundled default
- CDN down: uses stale cache or bundled default
- No cache at all: uses bundled default profiles
