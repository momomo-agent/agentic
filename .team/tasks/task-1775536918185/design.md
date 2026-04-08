# Design: Add matchProfile() unit tests

## Files to create
- `test/matcher.test.js`

## Function under test
```js
// src/detector/matcher.js
matchProfile(profiles: ProfilesData, hardware: HardwareInfo): ProfileConfig
```

## Test cases

### 1. apple-silicon match
```js
hardware = { platform: 'darwin', arch: 'arm64', gpu: { type: 'apple-silicon' }, memory: 32 }
// expect: profile with llm.model matching apple-silicon entry
```

### 2. nvidia match
```js
hardware = { platform: 'linux', arch: 'x64', gpu: { type: 'nvidia' }, memory: 16 }
// expect: profile with nvidia config
```

### 3. cpu-only fallback
```js
hardware = { platform: 'linux', arch: 'x64', gpu: { type: 'none' }, memory: 8 }
// expect: cpu-only profile (match: {} or match: { gpu: 'none' })
```

### 4. missing gpu field
```js
hardware = { platform: 'darwin', arch: 'x64', gpu: undefined, memory: 8 }
// expect: does not throw; returns a valid profile or cpu-only fallback
```

### 5. unknown GPU type
```js
hardware = { platform: 'linux', arch: 'x64', gpu: { type: 'unknown-gpu' }, memory: 8 }
// expect: falls back to default/cpu-only profile
```

### 6. no matching profile
```js
profiles = { version: '1', profiles: [{ match: { platform: 'win32' }, config: {...} }] }
hardware = { platform: 'darwin', ... }
// expect: throws 'No matching profile found'
```

## Dependencies
- `src/detector/matcher.js` (pure function, no I/O — no mocking needed)
- `profiles/default.json` for realistic test data
