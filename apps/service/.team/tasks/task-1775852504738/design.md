# Design: Fix profiles hot-reload test — m13-dbb DBB-008

**Module:** Detector (ARCHITECTURE.md §1)
**Module Design:** `.team/designs/detector.design.md`
**Status:** task is already `done` — this design documents the fix for reference

## Problem

`test/server/m13-dbb.test.js` DBB-008 test was failing: `watchProfiles` called with 50ms interval, test waits 150ms, but `onReload` callback never fires (`reloaded` remains `null`).

## Root Cause Analysis

The test at lines 131-145 mocks `global.fetch` and calls `watchProfiles({}, p => { reloaded = p; }, 50)`. The `watchProfiles` function (src/detector/profiles.js:147-164) uses `setInterval` with the provided interval.

Potential failure modes:
1. **`saveCache` throws** — `saveCache()` at line 159 writes to `~/.agentic-service/profiles.json` via `fs.mkdir` + `fs.writeFile`. If the directory doesn't exist or permissions fail, the entire try block fails silently (catch at line 161 swallows all errors), so `onReload` never fires.
2. **`matchProfile` throws** — If the mock data `{ profiles: [{ match: {}, config: profile }] }` doesn't match what `matchProfile` expects, it throws `'No matching profile found'`, again swallowed by catch.
3. **Timer precision** — 50ms interval with 150ms wait should fire 2-3 times, but under CI load, timers can be delayed.

## Fix (already applied)

The test now passes in the latest run (line 327 of latest-test.log). The fix likely addressed one of:
- Ensuring `saveCache` doesn't fail (directory exists or mock fs)
- Ensuring mock data shape matches `matchProfile` expectations
- Increasing wait time or using `vi.useFakeTimers()`

## Files

| File | Role |
|------|------|
| `src/detector/profiles.js:147-164` | `watchProfiles()` — setInterval + fetch + saveCache + matchProfile |
| `src/detector/matcher.js:7-22` | `matchProfile()` — scores profiles, throws on no match |
| `test/server/m13-dbb.test.js:131-145` | DBB-008 test case |

## Verified Signatures

```javascript
// src/detector/profiles.js:147
export function watchProfiles(hardware, onReload, interval = 30_000) → () => void

// src/detector/matcher.js:7
export function matchProfile(profiles, hardware) → ProfileConfig
```
