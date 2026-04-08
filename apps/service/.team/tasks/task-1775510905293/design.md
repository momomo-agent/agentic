# Design: 修复 src/detector/profiles.js

## Status
`profiles.js` already exports `getProfile(hardware)` which calls `matchProfile(profiles, hardware)` from `matcher.js`. Implementation is complete.

## Verification Required
Run existing tests to confirm:
- `getProfile(hardware)` returns `{ llm, stt, tts, fallback }` for valid hardware
- Falls back to built-in default when network unavailable and no cache

## Files
- `src/detector/profiles.js` — no changes needed
- `src/detector/matcher.js` — no changes needed
- `profiles/default.json` — must exist with correct structure

## Test Cases
```js
// DBB-001
const hw = { platform:'darwin', arch:'arm64', gpu:{ type:'apple-silicon' }, memory:16 };
const profile = await getProfile(hw);
assert(profile.llm && profile.stt && profile.tts && profile.fallback);

// DBB-002
// mock fetch to throw, delete cache file
const profile2 = await getProfile(hw);
assert(profile2.llm); // uses built-in default
```

## Edge Cases
- `profiles.profiles` array empty → `matchProfile` throws "No matching profile found"
- Cache file corrupted → catch JSON parse error, fall through to remote fetch
