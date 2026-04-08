# Test Result: CDN profiles.json cache staleness check (7-day refresh)

## Summary
- **Status**: PASSED
- **Tests**: 6 passed, 0 failed

## Results
- 8-day-old cache correctly triggers remote fetch
- 1-day-old cache correctly skips remote fetch
- Boundary: exactly 7 days is not expired
- 7 days + 1ms is expired
- `saveCache()` writes `timestamp: Date.now()`
- `loadProfiles()` calls `isCacheExpired(cached.timestamp)`
