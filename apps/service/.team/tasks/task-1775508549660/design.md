# Design: CDN URL修正为cdn.example.com

## Files to Modify
- `src/detector/profiles.js`

## Change
Replace the `PROFILES_URL` constant:

```js
// Before
const PROFILES_URL = 'https://cdn.jsdelivr.net/gh/momo-ai/agentic-service@main/profiles/default.json';

// After
const PROFILES_URL = 'https://cdn.example.com/momo-ai/agentic-service/profiles/default.json';
```

Also update the `watchProfiles` function — it references `PROFILES_URL` via the same constant, so no additional change needed there.

## Verification
- `grep -r "jsdelivr.net" src/` → zero results
- `grep "cdn.example.com" src/detector/profiles.js` → matches PROFILES_URL and watchProfiles fetch

## Edge Cases
- No logic change; only URL string replacement
- Cache behavior unchanged
- Offline fallback unchanged
