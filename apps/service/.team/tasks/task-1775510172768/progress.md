# 修复 profiles.js CDN URL 及 fallback 验证

## Progress

- Replaced hardcoded `cdn.example.com` URL with `process.env.PROFILES_URL || 'https://raw.githubusercontent.com/momomo/agentic-service/main/profiles/default.json'`
- Fallback to local `profiles/default.json` already handled by existing `loadBuiltinProfiles()`
