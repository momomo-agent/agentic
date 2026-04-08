# CDN profiles.json cache staleness check (7-day refresh)

## Progress

### Finding
Already fully implemented in `src/detector/profiles.js`:
- `CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000` (line 9)
- `isCacheExpired(timestamp)` checks staleness (lines 101-103)
- `loadProfiles()` refreshes cache when stale (lines 25-50)

No code changes needed.
