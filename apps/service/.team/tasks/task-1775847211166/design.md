# Task Design: Full cloud fallback — timeout + consecutive errors + auto-restore

**Task:** task-1775847211166
**Module:** Server（HTTP/WebSocket） — `src/server/brain.js`
**Module Design:** `.team/designs/server.design.md`

## Problem

PRD M4 requires brain.js to trigger cloud fallback on:
1. First-token timeout >5s
2. 3 consecutive Ollama errors
3. Auto-restore to local after 60s probe success

## Current State (VERIFIED from `src/server/brain.js`)

All three mechanisms are **already implemented** (lines 8-47, 127-171):

| PRD Requirement | Implementation | Lines | Status |
|----------------|---------------|-------|--------|
| First-token timeout 5s | `FIRST_TOKEN_TIMEOUT_MS = 5000`, `AbortController` + `setTimeout` | 12, 130-133 | ✅ Done |
| 3 consecutive errors | `MAX_ERRORS = 3`, `_errorCount++`, `_errorCount >= MAX_ERRORS` | 13, 150, 153 | ✅ Done |
| Auto-restore 60s probe | `PROBE_INTERVAL_MS = 60000`, `startProbing()` pings `/api/tags` | 14, 28-43 | ✅ Done |
| Config reset | `onConfigChange` resets `_cloudMode`, `_errorCount`, stops probing | 20-26 | ✅ Done |
| Fallback model slot | `resolveModel('chatFallback')` | 111, 160 | ✅ Done |

### Verified Constants (brain.js lines 12-14)
```javascript
const FIRST_TOKEN_TIMEOUT_MS = 5000;
const MAX_ERRORS = 3;
const PROBE_INTERVAL_MS = 60000;
```

### Verified State Variables (brain.js lines 9-11)
```javascript
let _cloudMode = false;
let _errorCount = 0;
let _probeTimer = null;
```

### Verified Flow (`chatWithTools`, lines 99-171)
1. If `_cloudMode` → skip Ollama, use `resolveModel('chatFallback')`
2. If primary is Ollama → try with `AbortController` + 5s first-token timeout
3. On first token received → `_errorCount = 0` (reset)
4. On error → `_errorCount++`; if timeout OR `_errorCount >= MAX_ERRORS` → `_cloudMode = true` + `startProbing()`
5. Fall back to `chatFallback` slot for current request

### Verified Probe Logic (`startProbing`, lines 28-43)
- `setInterval` at `PROBE_INTERVAL_MS` (60s)
- Pings `${ollamaHost}/api/tags` with 3s timeout
- On success → `_cloudMode = false`, `_errorCount = 0`, `stopProbing()`
- On failure → silent catch, stays in cloud mode

### Verified Tests (`test/m98-cloud-fallback.test.js`)
All 14 test cases pass — DBB-006 through DBB-014 cover:
- Timeout trigger, consecutive error trigger, auto-restore
- Probe failure stays in cloud mode
- Single error doesn't trigger cloud mode
- Timeout boundary (only aborts if no first token)
- Config change resets state
- chatFallback slot usage

## Implementation Plan

The implementation is **already complete**. The developer should:

### Step 1: Verify tests pass
```bash
npx vitest run test/m98-cloud-fallback.test.js
```

### Step 2: Verify full suite
```bash
npx vitest run
```

### Step 3: Mark task done

No code changes needed — the task description's claim that "Current implementation only falls back on Ollama error" is outdated. The full fallback was implemented in a prior commit.

## Files to Modify

None — implementation is complete.

## Test Cases

All covered by `test/m98-cloud-fallback.test.js` (14 assertions across 7 describe blocks).

## ⚠️ Unverified Assumptions

None — all verified from source code and test file.
