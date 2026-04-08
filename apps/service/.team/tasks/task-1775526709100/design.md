# Design: CDN profiles.json 7-day cache staleness check

## File to modify
`src/detector/profiles.js`

The `CACHE_MAX_AGE` constant and `isCacheExpired` function already exist. Verify they are wired correctly in `loadProfiles()`.

## Function: isCacheExpired(timestamp: number): boolean
```javascript
function isCacheExpired(timestamp) {
  return Date.now() - timestamp > CACHE_MAX_AGE;
}
```

## Function: loadCache(): Promise<{data, timestamp} | null>
- Read `CACHE_FILE`, parse JSON
- Return `{ data, timestamp }` where `timestamp` is stored in the cache file
- Return `null` if file missing or parse error

## Cache file format
```json
{ "timestamp": 1234567890000, "data": { ...profiles... } }
```

## Flow in loadProfiles()
1. Load cache → if exists and not expired → return `cached.data`
2. Fetch remote → save with `{ timestamp: Date.now(), data: remote }` → return remote
3. On fetch failure → return stale cache if available, else builtin

## Edge cases
- Cache file corrupted → treat as missing, fetch remote
- Remote fetch timeout (5s) → fall back to stale cache
- No cache + no network → use `profiles/default.json` builtin

## Test cases
- `isCacheExpired(Date.now() - 8 * 24 * 3600 * 1000)` → `true`
- `isCacheExpired(Date.now() - 1 * 24 * 3600 * 1000)` → `false`
