# Fix CDN profiles fallback when fetch fails and no cache exists

## Progress

- Verified `loadBuiltinProfiles()` already has try/catch fallback returning `{ version: '0', profiles: [] }`
- Ran test/profiles-fallback.test.js — 2/2 passed, no code changes needed
