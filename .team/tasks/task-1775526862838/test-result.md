# Test Result: task-1775526862838 — 修复 provider apiKey 校验

## Status: PASSED

## Tests Run
- DBB-014: throws before any network call when apiKey is absent ✓
- DBB-015: throws when apiKey is empty string ✓
- DBB-016: does not throw provider error with valid apiKey ✓

## Pass/Fail: 3/3

## Notes
- `createProvider()` correctly throws `'apiKey is required for provider: ...'` before switch
- `detectProvider()` throws `'apiKey is required'` for missing key
- Empty string `""` is falsy, caught by `!config.apiKey`
- `provider='custom'` skips apiKey check as designed
