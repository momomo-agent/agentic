# M61 Technical Design — cpu-only Profile + CDN Staleness

## Task 1: cpu-only profile (task-1775526662402)

### File: profiles/default.json
Add a `cpu-only` key alongside existing `apple-silicon` and `nvidia` entries:
```json
"cpu-only": {
  "llm": { "provider": "ollama", "model": "gemma2:2b", "quantization": "q4" },
  "stt": { "provider": "sensevoice", "model": "small" },
  "tts": { "provider": "kokoro", "voice": "default" },
  "fallback": { "provider": "openai", "model": "gpt-4o-mini" }
}
```

### File: src/detector/profiles.js
`getProfile(hardware)` must match `gpu.type === 'none'` → return `profiles['cpu-only']`.

## Task 2: CDN 7-day staleness (task-1775526709100)

### File: src/detector/profiles.js
In `fetchRemoteProfiles()` (or equivalent):
```javascript
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
// Before returning cached file:
const stat = fs.statSync(cacheFile);
if (Date.now() - stat.mtimeMs > CACHE_TTL) {
  // re-fetch from CDN, overwrite cache
}
```
- Cache file path: `~/.agentic-service/profiles.json` (or existing cache path)
- On fetch failure: log warning, return stale cache
- Edge case: cache file missing → always fetch
