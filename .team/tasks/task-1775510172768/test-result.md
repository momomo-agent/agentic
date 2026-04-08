# Test Result: 修复 profiles.js CDN URL 及 fallback 验证

## Summary
- Total: 7 | Passed: 7 | Failed: 0

## Results

### DBB-001: CDN URL is not a placeholder
- ✅ does not contain cdn.example.com
- ✅ uses raw.githubusercontent.com as default

### DBB-003: CDN URL configurable via env var
- ✅ uses process.env.PROFILES_URL when set
- ✅ falls back to default URL when env var not set

### DBB-002: fallback to local default.json on network failure
- ✅ loadBuiltinProfiles reads profiles/default.json
- ✅ fetch failure path falls through to builtin profiles
- ✅ profiles/default.json exists and is valid JSON

## Edge Cases
- Invalid URL in env var → fetch throws → fallback chain handles it (covered by existing catch block)
- Expired cache with no network → falls back to expired cache, then builtin (covered by loadProfiles logic)
