# CDN profiles.json 7天缓存刷新

## Progress

Already fully implemented in `src/detector/profiles.js`:
- `CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000` (line 9)
- `isCacheExpired(timestamp)` (lines 100-102)
- `loadProfiles()`: valid cache → remote → expired cache → builtin (lines 25-50)
- `saveCache(data)` writes `{ data, timestamp: Date.now() }` (lines 86-93)

No code changes needed.

