# Task Design: Implement full cloud fallback per PRD spec

**Module:** Runtime（服务运行时） — LLM
**Task:** task-1775793599517

## Problem

Current `llm.js` (line 121-130) only falls back on immediate Ollama error. PRD requires:
1. Timeout trigger: >5s → switch to cloud
2. Consecutive error trigger: 3 errors → switch to cloud
3. Auto-restore: probe Ollama every 60s while in cloud mode

## Files to Modify

- `src/runtime/llm.js` — VERIFIED, 150 lines, exports `chat()` at line 112

## Verified Internal APIs

- `chatWithOllama(messages)` — line 19, async generator, uses `AbortSignal.timeout(30000)`
- `chatWithOpenAI(messages, model)` — line 83, async generator
- `chatWithAnthropic(messages, model)` — line 50, async generator
- `loadConfig()` — line 7, returns config with `fallback.provider` and `fallback.model`
- `record(label, value)` — from `./latency-log.js`
- `startMark/endMark` — from `./profiler.js`

## Implementation Plan

### Step 1: Add module-level state (top of file, after imports)

```javascript
let _cloudMode = false
let _errorCount = 0
let _probeTimer = null
const TIMEOUT_MS = 5000
const MAX_ERRORS = 3
const PROBE_INTERVAL_MS = 60000
```

### Step 2: Add probe function

```javascript
function startProbing() {
  if (_probeTimer) return
  _probeTimer = setInterval(async () => {
    try {
      const config = await loadConfig()
      const ollamaHost = config.llm?.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434'
      const res = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        console.log('[llm] Ollama probe succeeded, restoring local')
        _cloudMode = false
        _errorCount = 0
        stopProbing()
      }
    } catch { /* probe failed, stay in cloud mode */ }
  }, PROBE_INTERVAL_MS)
}

function stopProbing() {
  if (_probeTimer) { clearInterval(_probeTimer); _probeTimer = null }
}
```

### Step 3: Modify `chat()` function

Replace the try/catch block (lines 121-130) with:

```javascript
// If already in cloud mode, skip Ollama
if (!_cloudMode) {
  try {
    const ollamaTimeout = AbortSignal.timeout(TIMEOUT_MS)
    let gotFirstToken = false
    for await (const chunk of chatWithOllama(messages)) {
      if (!gotFirstToken) {
        gotFirstToken = true
        _errorCount = 0  // reset on success
      }
      if (first) { record('llm_ttft', Date.now() - t0); first = false }
      yield chunk
    }
    record('llm_total', Date.now() - t0)
    return
  } catch (error) {
    _errorCount++
    const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError'
    console.warn(`[llm] Ollama failed (${_errorCount}/${MAX_ERRORS}): ${error.message}`)
    if (isTimeout || _errorCount >= MAX_ERRORS) {
      _cloudMode = true
      console.warn('[llm] Entering cloud fallback mode')
      startProbing()
    }
  }
}
```

### Step 4: Modify `chatWithOllama` timeout

Change `AbortSignal.timeout(30000)` to accept a passed signal or use the 5s timeout for first-token detection. The simplest approach: keep the 30s overall timeout in `chatWithOllama` but add a 5s first-token timer in `chat()`.

Alternative (simpler): In `chat()`, race the first chunk against a 5s timer:

```javascript
// In chat(), wrap the Ollama call with a first-token timeout
const firstTokenTimer = setTimeout(() => {
  // Will cause the generator to throw on next read
}, TIMEOUT_MS)
```

Actually, the cleanest approach: modify `chatWithOllama` to accept an `AbortSignal` parameter, and in `chat()` create a signal that aborts after 5s if no first token received.

### Step 5: Reset on config change

In the existing `onConfigChange` handler (line 14), add:
```javascript
_cloudMode = false
_errorCount = 0
stopProbing()
```

## Test Cases

1. **Timeout trigger:** Mock Ollama to respond after 6s → verify cloud fallback activates
2. **Consecutive errors:** Mock Ollama to fail 3 times → verify cloud mode after 3rd
3. **No premature fallback:** Mock Ollama to fail 2 times then succeed → verify stays local
4. **Auto-restore:** Enter cloud mode, then mock Ollama probe success → verify restores local within 60s
5. **Probe failure:** Enter cloud mode, mock Ollama probe failure → verify stays in cloud
6. **Error count reset:** Successful Ollama response resets `_errorCount` to 0

## ⚠️ Unverified Assumptions

- `AbortSignal.timeout()` is available (Node 18+). Project uses ESM imports so likely Node 18+. Developer should verify `engines` in package.json.
- The 5s timeout is for first-token, not total response. A long streaming response that started within 5s should NOT trigger fallback.
