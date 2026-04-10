# Module Design: Runtime（服务运行时）

**ARCHITECTURE.md Section:** 2. Runtime（服务运行时）
**Status:** ready-for-review

## LLM — lives in src/server/brain.js (NOT src/runtime/)

⚠️ There is no `src/runtime/llm.js`. All LLM chat + fallback logic is in `src/server/brain.js`.
See `.team/designs/server.design.md` for brain.js details.

### Verified Exports (src/server/brain.js)
```javascript
export function registerTool(name, fn)                          // line 49
export async function* chat(input, options = {})                // line 264
export async function chatSession(sessionId, userMessage, options = {})  // line 279
```

### Cloud Fallback — IMPLEMENTED (brain.js lines 8-47, 99-171)
- **Timeout trigger:** `FIRST_TOKEN_TIMEOUT_MS = 5000` — AbortController aborts if no first token
- **Consecutive errors:** `MAX_ERRORS = 3` — `_errorCount++` on failure, cloud mode at threshold
- **Auto-restore:** `PROBE_INTERVAL_MS = 60000` — probes `${ollamaHost}/api/tags`, restores on success
- **Config reset:** `onConfigChange` resets `_cloudMode`, `_errorCount`, stops probing
- **Fallback slot:** `resolveModel('chatFallback')` from model pool

### Internal Dependencies
- `../config.js` → `getConfig`, `getModelPool`, `getAssignments`, `onConfigChange`
- `./hub.js` → `getSession`, `broadcastSession`
- `../runtime/profiler.js` → `startMark`, `endMark`

## Memory (src/runtime/memory.js)

### Verified Exports
```javascript
export async function add(text)                    // line 12
export async function remove(key)                  // line 26
export { remove as delete }                        // line 33
export async function search(query, topK = 5)      // line 35
```

### Internal Data Flow
- `embed(text)` → vector via `./embed.js`
- `get/set/del` → KV via `../store/index.js`
- Index stored at key `mem:__index__` as array of IDs
- Write serialization via `_lock` promise chain

## Embed (src/runtime/embed.js)

```javascript
export async function embed(text)  // delegates to agentic-embed localEmbed()
```

### Verified Contract
- `localEmbed` from agentic-embed expects `string[]`, returns `number[][]`
- `embed()` wraps single text in array, returns first vector: `embed(text) → number[]`
- Empty string → `[]`, non-string → `TypeError`

## STT (src/runtime/stt.js)

### Verified Exports
```javascript
export async function init()                    // line 14 — auto-detect provider from profile
export async function transcribe(audioBuffer)   // line 41 — returns text
```

### Adapter Registry
```javascript
const ADAPTERS = {
  sensevoice: () => import('./adapters/voice/sensevoice.js'),
  whisper:    () => import('./adapters/voice/whisper.js'),
  default:    () => import('./adapters/voice/openai-whisper.js'),
}
```

### Init Flow
1. `detect()` → `getProfile(hardware)` → `profile.stt.provider`
2. Load adapter via dynamic import
3. If adapter has `check()`, verify reachability
4. On failure: fallback chain `sensevoice → whisper → openai`

### Error Handling
- `transcribe()` throws `'not initialized'` if `init()` not called
- `transcribe()` throws `{ code: 'EMPTY_AUDIO' }` on empty buffer
- Instruments via `profiler.startMark('stt')` / `endMark('stt')` + `latency-log.record('stt', ms)`

## TTS (src/runtime/tts.js)

### Verified Exports
```javascript
export async function init()                // line 23 — auto-detect provider from config/profile
export async function synthesize(text)      // line 61 — returns audio buffer
```

### Adapter Registry
```javascript
const ADAPTERS = {
  'macos-say': () => import('./adapters/voice/macos-say.js'),
  piper:       () => import('./adapters/voice/piper.js'),
  kokoro:      () => import('./adapters/voice/kokoro.js'),
  elevenlabs:  () => import('./adapters/voice/elevenlabs.js'),
  openai:      () => import('./adapters/voice/openai-tts.js'),
  default:     () => import('./adapters/voice/openai-tts.js'),
}
```

### Init Flow
1. Check `~/.agentic-service/config.json` → `config.tts.provider`
2. Fallback: `detect()` → `getProfile(hardware)` → `profile.tts.provider`
3. Platform default: macOS → `macos-say`, others → `default` (openai)

### Error Handling
- `synthesize()` throws `'not initialized'` if `init()` not called
- `synthesize()` throws `{ code: 'EMPTY_TEXT' }` on empty/whitespace text
- Instruments via `profiler.startMark('tts')` / `endMark('tts')` + `latency-log.record('tts', ms)`

## VAD (src/runtime/vad.js)

### Verified Exports
```javascript
export function detectVoiceActivity(buffer)  // line 3 — returns boolean
```

### Algorithm
- RMS energy detection on Int16 PCM audio
- Threshold: `SILENCE_THRESHOLD = 0.01`
- Returns `false` for null/empty buffers (< 2 bytes)
- Pure function, no state

## Sense (src/runtime/sense.js)

### Verified Exports — Full API Surface (11 exports)
```javascript
// Browser mode
export async function init(videoElement)                    // line 9
export function on(type, handler)                           // line 14
export function start()                                     // line 24 — 60fps interval loop
export function stop()                                      // line 58
export function detect(frame)                               // line 47 — single-frame detection

// Server headless mode
export async function initHeadless(options?)                // line 107
export async function startHeadless()                       // line 111 — returns EventEmitter
export function detectFrame(buffer)                         // line 117

// Wake word pipeline (server-side, requires sox + node-record-lpcm16)
export async function startWakeWordPipeline(onWakeWord)     // line 65
export function stopWakeWordPipeline()                      // line 102
```

### Event Types
- `face_detected` → `{ boundingBox }`
- `gesture_detected` → `{ gesture }`
- `object_detected` → `{ label, confidence }` (filtered > 0.5)
- `wake_word` → `{}`

### Internal Dependencies
- `./adapters/sense.js` → `createPipeline()` → `agentic-sense`
- `./vad.js` → `detectVoiceActivity()` (used in wake word pipeline)
- `node-record-lpcm16` (optional, dynamic import)
- `sox` binary (optional, checked at runtime)

### Two Modes
1. **Browser mode**: `init(videoElement)` → `start()` → interval-based detection at ~60fps
2. **Headless mode**: `initHeadless()` → `startHeadless()` → EventEmitter with wake word detection

## Adapters (src/runtime/adapters/)

### adapters/embed.js (STUB — dead code)
```javascript
export async function embed(text) { throw new Error('agentic-embed: not implemented') }
```
⚠️ Not used by anything. `src/runtime/embed.js` imports directly from `agentic-embed`.

### adapters/sense.js
```javascript
export function createPipeline(options = {})  // line 3 — wraps AgenticSense constructor
```
- Imports `AgenticSense` from `agentic-sense`
- Calls `instance.init()` if available

### Voice Adapters (adapters/voice/*)

| File | Provider | Export | Notes |
|------|----------|--------|-------|
| `elevenlabs.js` | ElevenLabs | `synthesize(text)` | HTTP API, requires API key |
| `macos-say.js` | macOS | `synthesize(text)` | `say` command, darwin only |
| `openai-tts.js` | OpenAI | `synthesize(text)` | HTTP API, requires API key |
| `openai-whisper.js` | OpenAI | `transcribe(buffer)` | HTTP API, requires API key |
| `piper.js` | Piper | `synthesize(text)` | Auto-downloads binary, local |
| `sensevoice.js` | SenseVoice | `transcribe(buffer)` | HTTP API to local SenseVoice server |
| `whisper.js` | Whisper.cpp | `transcribe(buffer)` | Local binary adapter |

All TTS adapters export `synthesize(text) → audioBuffer`.
All STT adapters export `transcribe(buffer) → text`.

## Instrumentation Utilities

### profiler.js (src/runtime/profiler.js)
```javascript
export function startMark(label)           // line 4 — records Date.now() start
export function endMark(label)             // line 8 — returns elapsed ms, updates metrics
export function getMetrics()               // line 18 — returns { [label]: { last, avg, count } }
export function measurePipeline(stages)    // line 26 — returns { stages, total, pass: total < 2000 }
```
- Module-level `marks` Map (active timers) + `metrics` Map (aggregated stats)
- Used by: `server/brain.js`, `server/api.js`, `runtime/stt.js`, `runtime/tts.js`

### latency-log.js (src/runtime/latency-log.js)
```javascript
export function record(stage, ms)   // line 3 — appends sample, logs to console
export function p95(stage)          // line 9 — returns 95th percentile for stage
export function reset()             // line 15 — clears all samples
```
- Module-level `samples` object: `{ [stage]: number[] }`
- Used by: `runtime/stt.js`, `runtime/tts.js`

## Constraints
- `_lock` in memory.js ensures serial writes — must not be bypassed
- `embed()` throws TypeError on non-string — callers must validate
- `adapters/embed.js` is dead code — should be removed or wired up
- Wake word pipeline requires `sox` binary — gracefully degrades if missing
- Voice adapters with API keys will fail silently if keys not configured
