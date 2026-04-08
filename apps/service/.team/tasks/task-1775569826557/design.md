# Design: Fix CDN profiles fallback when fetch fails and no cache exists

## Problem
When CDN fetch fails and no local cache exists, `loadBuiltinProfiles()` is called but may fail if the `profiles/default.json` path resolution is wrong (e.g., `import.meta.url` resolves incorrectly in certain execution contexts).

## File to Modify
- `src/detector/profiles.js`

## Root Cause
`loadBuiltinProfiles()` uses:
```js
const builtinPath = new URL('../../profiles/default.json', import.meta.url);
```
This path is relative to `src/detector/profiles.js`, so `../../profiles/` resolves to `profiles/` at the project root — correct. The bug is likely that `profiles/default.json` doesn't exist or has wrong content shape.

## Fix
1. Verify `profiles/default.json` exists and has the correct `{ version, profiles: [] }` shape
2. Add a try/catch in `loadBuiltinProfiles()` that returns a safe empty default if the file read fails:

```js
async function loadBuiltinProfiles() {
  try {
    const builtinPath = new URL('../../profiles/default.json', import.meta.url);
    const content = await fs.readFile(builtinPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { version: '0', profiles: [] };
  }
}
```

3. Ensure `loadProfiles()` never throws — the fallback chain must always resolve.

## Function Signatures
```js
async function loadBuiltinProfiles(): Promise<ProfilesData>
export async function getProfile(hardware: HardwareInfo): Promise<ProfileConfig>
```

## Edge Cases
- `profiles/default.json` missing → return `{ version: '0', profiles: [] }`
- `matchProfile` with empty profiles array → must return a safe default config (check `matcher.js`)

## Test Cases
- Fetch fails + no cache + default.json exists → returns builtin profile
- Fetch fails + no cache + default.json missing → returns empty-safe default, no throw
