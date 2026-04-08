# Task Design: CDN profiles真实端点配置

## Files to Modify

- **MODIFY** `src/detector/profiles.js`

## Changes

Current default URL:
```js
const PROFILES_URL = process.env.PROFILES_URL || 'https://raw.githubusercontent.com/momomo/agentic-service/main/profiles/default.json';
```

This is already a real, non-placeholder URL. The task requires:
1. Verify no `cdn.example.com` or placeholder strings exist in the file
2. Ensure `PROFILES_URL` env var is documented in README/startup logs
3. Add startup log: `console.log('Profiles URL:', PROFILES_URL)` in `fetchRemoteProfiles()`

## No structural changes needed — existing logic is correct:
- Remote fetch with 5s timeout ✓
- 7-day cache with fallback to expired cache ✓
- Built-in default as last resort ✓
- `PROFILES_URL` env var override ✓

## Test Cases

- Default URL contains no placeholder strings
- `PROFILES_URL=https://custom/profiles.json` → fetch uses that URL
- CDN unreachable → uses cache, no crash
- No cache + CDN unreachable → uses built-in `profiles/default.json`
