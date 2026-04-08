# Design: CDN profiles.json cache staleness check (7-day refresh)

## File
- `src/detector/profiles.js`

## Current State
`CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000` is defined. `isCacheExpired(timestamp)` checks `Date.now() - timestamp > CACHE_MAX_AGE`. Cache file stores `{ data, timestamp }`.

## Verification
The 7-day staleness logic is already implemented. Verify:
1. `saveCache()` writes `timestamp: Date.now()` — confirmed in existing code
2. `loadProfiles()` calls `isCacheExpired(cached.timestamp)` before using cache — confirmed
3. On expiry: fetches remote, saves new cache with fresh timestamp

## Edge Cases
- Remote fetch fails + cache expired: falls back to stale cache with warning
- Cache file missing: skips to remote fetch
- Remote fetch fails + no cache: uses built-in `profiles/default.json`

## Test Cases
- Cache timestamp = now - 8 days → remote fetch triggered
- Cache timestamp = now - 1 day → cache used, no fetch
- Remote fetch throws → stale cache returned with console.warn
