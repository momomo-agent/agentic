# CDN Real Endpoint — Technical Design

## Files to Modify
- `src/detector/profiles.js` — replace placeholder URL constant

## Change
```js
// Before
const PROFILES_URL = process.env.PROFILES_URL || 'https://cdn.example.com/profiles.json';

// After
const PROFILES_URL = process.env.PROFILES_URL || 'https://raw.githubusercontent.com/momomo/agentic-service/main/profiles/default.json';
```

The file already uses the correct GitHub raw URL (confirmed in source). Verify no other placeholder URLs exist in the codebase.

## Files to Check
- `profiles/default.json` — must exist and be valid JSON at the target URL path
- `src/detector/profiles.js` — confirm `PROFILES_URL` constant value

## Algorithm
1. Read current `PROFILES_URL` value
2. If it contains `cdn.example.com` or any placeholder, replace with the real GitHub raw URL
3. Verify `profiles/default.json` exists in repo root

## Edge Cases
- `PROFILES_URL` env var override must still work (already supported)
- Cache invalidation: existing `~/.agentic-service/profiles.json` cache unaffected

## Test Cases
- `fetch(PROFILES_URL)` returns valid JSON with at least one profile entry
- Offline fallback still loads bundled `profiles/default.json`
