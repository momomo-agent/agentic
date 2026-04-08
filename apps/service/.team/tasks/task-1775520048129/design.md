# Design: src/detector/profiles.js — getProfile

## File
`src/detector/profiles.js`

## Exports
```js
export async function getProfile(hardware: HardwareInfo): Promise<ProfileConfig>
export function watchProfiles(hardware: HardwareInfo, onReload: (p: ProfileConfig) => void, interval?: number): () => void
```

## Logic — getProfile
1. `loadProfiles()`: try cache (CACHE_FILE, max 7 days) → try remote fetch (PROFILES_URL, 5s timeout) → expired cache → builtin `profiles/default.json`
2. `matchProfile(profiles, hardware)` from `./matcher.js` returns best-match config

## Logic — watchProfiles
- setInterval every 30s, fetch remote with `If-None-Match` ETag
- On 200: save cache, call `onReload(matchProfile(data, hardware))`
- On 304 or error: skip
- Returns `() => clearInterval(timer)`

## Paths
- `CACHE_FILE`: `~/.agentic-service/profiles.json`
- `PROFILES_URL`: env `PROFILES_URL` or GitHub raw URL
- Builtin: `../../profiles/default.json` relative to module

## Error handling
- Remote fetch failure → warn + use cache or builtin
- Cache parse error → return null (treated as miss)

## Dependencies
- `src/detector/matcher.js` → `matchProfile(profiles, hardware)`
- `profiles/default.json` (builtin fallback)
