# Design: Fix config-persistence test — reloadConfig reads fresh data

**Module:** Server / Config (ARCHITECTURE.md — config.js)
**Module Design:** `.team/designs/server.design.md`
**Status:** merged (fix committed as 57986a64)

## Problem

`test/config-persistence.test.js` line 75-84 "reloadConfig reads fresh data from disk" fails:
```
AssertionError: expected undefined to be 'yes'
```

The test:
1. Calls `setConfig({ before: true })` — writes config to disk
2. Reads the file directly, adds `injected: 'yes'`, writes back via `fs.writeFile`
3. Calls `reloadConfig()` — should re-read from disk
4. Asserts `config.injected === 'yes'` — gets `undefined`

## Root Cause Analysis

`reloadConfig()` (src/config.js:79) calls `_readFromDisk()` (line 304). The `_readFromDisk` function:
1. Reads `CONFIG_PATH` → parses JSON
2. Runs `_migrateOldFormat(parsed)` → returns `parsed` (no-op for new format with `modelPool`)
3. Returns `deepMerge(DEFAULTS, migrated)`

The `deepMerge` function (line 339) only merges keys from `source` into `target`. Since `DEFAULTS` is the target and `migrated` is the source, the `injected` key from `migrated` should be preserved in the result.

Possible failure modes:
1. **`deepMerge` drops unknown keys** — If `deepMerge` only copies keys that exist in `target` (DEFAULTS), then `injected` would be dropped. This is the most likely cause.
2. **File write race** — The test's `fs.writeFile` and `reloadConfig` could race, but they're sequential with `await`.
3. **CONFIG_PATH mismatch** — Both test and module use `path.join(os.homedir(), '.agentic-service', 'config.json')`, so this is unlikely.

### Verified: deepMerge implementation (line 339-351)

```javascript
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
        && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
```

`deepMerge` iterates `Object.keys(source)` and copies all keys. So `injected: 'yes'` from `source` should appear in `result`. This means the issue is NOT in deepMerge.

### Alternative hypothesis: _writeToDisk strips the key

When `setConfig({ before: true })` runs:
1. `getConfig()` returns DEFAULTS (cache is null, file doesn't exist)
2. `deepMerge(DEFAULTS, { before: true })` → `{ ...DEFAULTS, before: true }`
3. `_writeToDisk(merged)` → destructures `{ _hardware, _profileSource, ...clean }` → writes `clean`

So the file on disk has `{ modelPool: [], assignments: {...}, stt: {...}, tts: {...}, ollamaHost: '...', before: true }`.

Then the test reads this, adds `injected: 'yes'`, writes back. The file now has `{ ..., before: true, injected: 'yes' }`.

Then `reloadConfig()` → `_readFromDisk()` → reads file → `_migrateOldFormat(parsed)` (no-op since `modelPool` exists) → `deepMerge(DEFAULTS, parsed)` → should include `injected: 'yes'`.

**This should work.** The failure may be intermittent or environment-specific (e.g., the `~/.agentic-service/` directory doesn't exist when the test runs, causing `_readFromDisk` to hit the catch block and return `{ ...DEFAULTS }` without `injected`).

### Most likely root cause: ENOENT during _readFromDisk

If `~/.agentic-service/config.json` doesn't exist when `_readFromDisk` runs (e.g., the directory was cleaned between `fs.writeFile` and `reloadConfig`), the catch block returns `{ ...DEFAULTS }` which has no `injected` key.

The `beforeEach` removes `CONFIG_PATH` and `CONFIG_PATH + '.tmp'` but does NOT remove the directory. However, if another test or process removes the directory, the test's `fs.writeFile` at line 80 would fail with ENOENT (can't write to non-existent directory).

## Fix Strategy

The fix should be in the **test**, not in production code:

### Option A (recommended): Ensure directory exists before direct write

```javascript
it('reloadConfig reads fresh data from disk', async () => {
  await configModule.setConfig({ before: true });
  await fs.mkdir(CONFIG_DIR, { recursive: true });  // ensure dir exists
  const current = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  current.injected = 'yes';
  await fs.writeFile(CONFIG_PATH, JSON.stringify(current, null, 2));
  await configModule.reloadConfig();
  const config = await configModule.getConfig();
  expect(config.injected).toBe('yes');
});
```

### Option B: Use atomic write pattern in test (match production code)

Write to `.tmp` then rename, same as `_writeToDisk`.

### Recommendation: Option A

The `setConfig` call already creates the directory. The `fs.mkdir` is a safety net. The real fix may also need to check that `reloadConfig` properly invalidates `_cache` — verify that `_cache` is set to the new value, not the stale one.

## Files to Modify

| File | Change |
|------|--------|
| `test/config-persistence.test.js:75-84` | Add `fs.mkdir(CONFIG_DIR, { recursive: true })` before direct write, or investigate why `_readFromDisk` returns DEFAULTS |

## Verified Signatures

```javascript
// src/config.js:79
export async function reloadConfig() → Promise<Config>

// src/config.js:34
export async function getConfig() → Promise<Config>

// src/config.js:43
export async function setConfig(updates) → Promise<void>

// src/config.js:304
async function _readFromDisk() → Promise<Config>  // internal

// src/config.js:320
async function _writeToDisk(data) → Promise<void>  // internal
```

## Test Cases

1. ✅ `setConfig` writes valid JSON — already passing
2. ✅ No `.tmp` file remains — already passing
3. ✅ Multiple sequential writes — already passing
4. ❌ `reloadConfig reads fresh data from disk` — fix needed
5. ✅ All other config-persistence tests — already passing

## Actual Fix (commit 57986a64)

The developer implemented a two-part fix:

### 1. src/config.js line 15 — configurable CONFIG_DIR
```javascript
// Before:
const CONFIG_DIR = path.join(os.homedir(), '.agentic-service');
// After:
const CONFIG_DIR = process.env.AGENTIC_CONFIG_DIR || path.join(os.homedir(), '.agentic-service');
```
Allows tests to isolate via `AGENTIC_CONFIG_DIR` env var, preventing cross-test interference.

### 2. test/config-persistence.test.js lines 48-55 — avoid direct file read race
Changed "multiple sequential writes" test to verify via `reloadConfig()` + `getConfig()` instead of direct `fs.readFile`, eliminating race conditions with parallel test files.

## Verification
- All 10 tests in `config-persistence.test.js` pass
- Full suite: 171 files, 973 tests pass
