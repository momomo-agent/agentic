# Detector Module — Internal Design

Module: Detector (ARCHITECTURE.md §1)
Status: ready-for-review

## Overview

The Detector module handles hardware detection, profile matching, and Ollama bootstrapping. It answers: "What hardware does this machine have, and what model configuration should we use?"

## Internal Data Structures

### HardwareInfo (from `detector/hardware.js`)
```javascript
{
  platform: 'darwin' | 'linux' | 'win32',
  arch: 'arm64' | 'x64',
  gpu: { type: 'apple-silicon' | 'nvidia' | 'amd' | 'cpu-only' | 'none', vram: number },
  memory: number,  // GB
  cpu: { cores: number, model: string }
}
```

### ProfilesData (from `detector/profiles.js`)
```javascript
{
  version: string,
  profiles: Array<{
    match: { platform?, arch?, gpu?, minMemory? },  // MatchCriteria
    config: { llm, stt, tts, fallback }              // ProfileConfig
  }>
}
```

### Cache format (on disk at `~/.agentic-service/profiles.json`)
```javascript
{
  data: ProfilesData,
  timestamp: number  // Date.now() at write time
}
```

## Key Algorithms

### Profile Loading (4-layer fallback in `profiles.js:loadProfiles`)
1. Fresh cache (< 7 days) → use directly
2. Remote fetch (CDN URL, 5s timeout) → save to cache, use
3. Expired cache (≥ 7 days) → use with warning
4. Built-in `profiles/default.json` → last resort

All layers return `ProfilesData`. The result is always passed through `matchProfile()`.

### Profile Matching (`matcher.js:matchProfile`)
- Scores each profile entry against hardware
- Weights: platform=30, gpu=30, arch=20, minMemory=20
- Hard eliminators: platform mismatch → 0, gpu mismatch → 0, memory insufficient → 0
- Empty `match: {}` → score 1 (universal fallback)
- Normalization: `score / maxScore * 100` (only counts criteria that are defined)
- Known limitation: normalization means a 1-criterion match (30/30=100) ties with a 3-criterion match (80/80=100). First-in-array wins on ties.

### Profile Watching (`profiles.js:watchProfiles`)
- Polls CDN at configurable interval (default 30s)
- Uses ETag/If-None-Match for conditional fetching
- On change: saves cache + calls `onReload(matchProfile(data, hardware))`

## Error Handling

- `matchProfile` throws `'No matching profile found'` when all profiles score 0
- `loadProfiles` never throws — always falls through to builtin
- `fetchRemoteProfiles` throws on non-200 or timeout (caught by loadProfiles)
- `loadCache` returns null on any read/parse error (caught silently)

## Internal Dependencies

```
getProfile(hw) → loadProfiles() → matchProfile(profiles, hw)
                  ├── loadCache()
                  ├── fetchRemoteProfiles()
                  └── loadBuiltinProfiles()

watchProfiles(hw, cb) → fetch + matchProfile + saveCache
```

## Constraints

- Cache directory: `~/.agentic-service/` (hardcoded via `os.homedir()`)
- Cache max age: 7 days (hardcoded constant)
- Remote timeout: 5 seconds (AbortSignal.timeout)
- `matchProfile` is a pure function — no side effects, no I/O
- `default.json` must always contain a `match: {}` fallback profile to prevent "No matching profile" errors on unknown hardware

## Utility Modules

### sox.js (src/detector/sox.js)
```javascript
export async function ensureSox()  // line 25 — checks + auto-installs sox
```
- `isSoxInstalled()` → `which sox`
- `installSox()` → `brew install sox` (darwin) / `apt-get install -y sox` (linux) / throws on Windows
- Used by: wake word pipeline setup (indirectly via sense.js sox check)

### download-state.js (src/cli/download-state.js)
```javascript
export function getDownloadState()       // line 32 — returns { inProgress, model, status, progress, total }
export function setDownloadState(updates) // line 36 — merges updates, persists to disk
export function clearDownloadState()     // line 41 — resets state, deletes state file
```
- State file: `~/.agentic-service/download-state.json`
- Module-level singleton object, loaded from disk on import
- Used by: `cli/setup.js` during Ollama model pull progress tracking
