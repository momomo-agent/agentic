# Test Result: Fix openai.ts apiKey validation for custom+baseUrl provider

## Summary
- Total tests: 97
- Passed: 97
- Failed: 0

## Verification

### Design changes confirmed in src/providers/openai.ts:
- Line 7: `if (!config.apiKey && !config.baseUrl)` — throws only when both absent ✓
- Line 33: `...(config.apiKey ? { 'Authorization': ... } : {})` — header conditional on apiKey ✓

### Key test results:
- `custom-provider-baseurl.test.ts > does not throw with only baseUrl (no apiKey)` ✓
- `m23-apikey-optional.test.ts > does not throw with provider=custom, baseUrl, no apiKey` ✓
- `m23-apikey-optional.test.ts > throws for anthropic without apiKey` ✓
- `m23-apikey-optional.test.ts > throws for openai without apiKey` ✓

## Edge Cases
- baseUrl='' (empty string) still throws — acceptable per design
- apiKey + baseUrl together sends Bearer header — no regression

## Status: PASS
