# Design: Verify CDN profiles.json fallback to default.json

## Files to check/modify
- `src/detector/profiles.js` — fallback chain already implemented; verify `loadBuiltinProfiles()` reads `profiles/default.json`
- `profiles/default.json` — must include a cpu-only profile entry
- `test/profiles-fallback.test.js` — new test file covering fallback path

## Fallback chain (already in profiles.js)
1. Cache (fresh) → return
2. Remote CDN fetch → save cache, return
3. Cache (expired) → return with warning
4. `loadBuiltinProfiles()` → read `profiles/default.json`

## Verification steps
1. Read `loadBuiltinProfiles()` — confirm it reads `profiles/default.json` relative to `import.meta.url`
2. Check `profiles/default.json` has an entry with `match: {}` or `match: { gpu: 'none' }` as cpu-only fallback
3. If cpu-only entry missing, add it to `profiles/default.json`

## Test file: `test/profiles-fallback.test.js`
```js
// Mock fetch to throw, mock cache miss → expect loadBuiltinProfiles called
// Assert returned profile is valid (has llm, stt, tts fields)
```

## Function signatures (no changes needed)
```js
async function loadBuiltinProfiles(): Promise<ProfilesData>
// reads profiles/default.json via fs.readFile + JSON.parse
```

## Edge cases
- `profiles/default.json` parse error → throw with clear message
- Timeout (AbortSignal.timeout(5000)) already handled in fetchRemoteProfiles

## Test cases
- fetch throws → `loadBuiltinProfiles()` called → returns valid ProfilesData
- returned data has at least one profile with `config.llm`, `config.stt`, `config.tts`
