# Test Result: profiles.js getProfile + cpu-only profile

## Summary
- Passed: 6
- Failed: 0

- [PASS] cpu-only profile exists in default.json
- [PASS] getProfile apple-silicon returns high-end model
- [PASS] getProfile nvidia returns nvidia profile
- [PASS] getProfile gpu:none returns cpu-only profile
- [PASS] getProfile empty hardware returns default, no exception
- [PASS] getProfile unknown gpu falls back to cpu-only
