# Implement CDN profiles.json 7-day cache staleness refresh

## Verification Complete

The 7-day cache staleness refresh is **already implemented** in `src/detector/profiles.js`.

## Current Implementation

1. **Cache expiration check** (line 101-103):
   - `isCacheExpired()` checks if cache timestamp is older than 7 days
   - `CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000` (line 9)

2. **Load strategy** (lines 26-49):
   - Load from cache if fresh (< 7 days old)
   - Fetch from remote if cache is stale
   - Fall back to stale cache if remote fetch fails
   - Fall back to built-in profiles if no cache exists

3. **Cache structure**:
   - Stores `{ data, timestamp }` in `~/.agentic-service/profiles.json`
   - Timestamp used to calculate age

4. **Error handling**:
   - Network failures gracefully fall back to stale cache
   - Missing cache falls back to built-in profiles

## Status
No changes needed. Feature already implemented and working as specified.