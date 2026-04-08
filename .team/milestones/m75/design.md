# M75 Technical Design — CDN Staleness + LAN Tunnel

## CDN Cache Staleness (task-1775530134599)

`src/detector/profiles.js` already has `CACHE_MAX_AGE = 7 days` and `isCacheExpired(timestamp)`. The issue is that `loadCache()` reads a timestamp field from the JSON, but the staleness check needs to use the file's mtime as the source of truth (or the stored timestamp). Verify the existing `isCacheExpired` path is exercised correctly — if it already works, the task is a verification task only.

## LAN Tunnel (task-1775530233859)

New file: `src/tunnel.js` — spawns ngrok or cloudflare tunnel, prints URL.
Add `"tunnel": "node src/tunnel.js"` to `package.json` scripts.
