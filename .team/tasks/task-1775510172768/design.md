# Design: 修复 profiles.js CDN URL 及 fallback 验证

## Files to Modify
- `src/detector/profiles.js`

## Changes

### 1. Replace hardcoded URL with env var
```js
// Line 5 — replace:
const PROFILES_URL = 'https://cdn.example.com/momo-ai/agentic-service/profiles/default.json';
// with:
const PROFILES_URL = process.env.PROFILES_URL || 'https://raw.githubusercontent.com/momomo/agentic-service/main/profiles/default.json';
```

### 2. fetchRemoteProfiles — no change needed (already uses PROFILES_URL)

## Test Cases
- `PROFILES_URL=https://example.com node -e "import('./src/detector/profiles.js')"` → fetch targets example.com
- Kill network → service starts, uses local `profiles/default.json`
- No env var → URL does not contain `cdn.example.com`

## Edge Cases
- Invalid URL in env var → fetch throws → fallback to cache/builtin (already handled)
