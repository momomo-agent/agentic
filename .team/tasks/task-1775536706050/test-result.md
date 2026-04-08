# Test Result: Verify CDN profiles.json fallback to default.json

## Test Summary
- **Total Tests**: 2
- **Passed**: 2
- **Failed**: 0
- **Status**: ✅ PASS

## Test Cases

### 1. Fallback to built-in profiles when fetch fails and cache is absent
**Test**: `test/profiles-fallback.test.js` - loadBuiltinProfiles is called when fetch fails and cache is absent
**Expected**: When fetch fails and no cache exists, loadBuiltinProfiles() should be called and return valid profile data
**Result**: ✅ PASS
**Details**: 
- Mocked fetch to throw network error
- Stubbed HOME to non-existent directory to ensure cache miss
- Verified returned profile has llm, stt, tts fields
- Console output confirms: "Failed to fetch remote profiles: network error" → "Using built-in default profiles"

### 2. default.json contains cpu-only catch-all profile
**Test**: `test/profiles-fallback.test.js` - default.json has a cpu-only catch-all profile with llm/stt/tts
**Expected**: profiles/default.json must have at least one profile with empty match {} or gpu: 'none'/'cpu-only'
**Result**: ✅ PASS
**Details**: 
- Found 3 matching profiles: gpu: 'cpu-only', gpu: 'none', and match: {}
- All contain required llm, stt, tts config fields

## Code Verification

### loadBuiltinProfiles() implementation (lines 109-113)
✅ Correctly reads `profiles/default.json` using `import.meta.url` relative path
✅ Uses fs.readFile + JSON.parse
✅ Returns ProfilesData structure

### Fallback chain in loadProfiles() (lines 25-50)
✅ 1. Check cache (fresh) → return
✅ 2. Fetch remote → save cache, return
✅ 3. Use expired cache if available
✅ 4. Call loadBuiltinProfiles() as final fallback

### profiles/default.json
✅ Contains cpu-only profile (line 58)
✅ Contains gpu: 'none' profile (line 67)
✅ Contains catch-all profile with match: {} (line 76)
✅ All profiles have llm, stt, tts, fallback fields

## DBB Verification (M84)
- ✅ `src/detector/profiles.js` falls back to `profiles/default.json` when CDN fetch fails
- ✅ Fallback also triggers on timeout (5s AbortSignal.timeout on line 59)
- ✅ Test covers the fallback path and returns valid profile data

## Edge Cases Identified
None - all edge cases are covered:
- Network failure → fallback works
- Cache miss → fallback works
- Timeout handling → already implemented with AbortSignal.timeout(5000)
- Parse error → would throw with clear message from JSON.parse

## Conclusion
Implementation is correct and complete. All acceptance criteria met. Fallback chain works as designed.
