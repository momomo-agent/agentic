# Task Design: Document missing modules in ARCHITECTURE.md — close 85% → 90% gap

**Task ID:** task-1775849914280
**Module:** ARCHITECTURE.md (architect-owned)
**Status:** ready-for-review

## Context

ARCHITECTURE.md is at 85%. After auditing the actual source files against the current ARCHITECTURE.md, the document already has sections for most modules (Store §5, Runtime §3, CLI §7, Adapters §11, Embed §10). However, several sections are incomplete or missing detail compared to the actual implementations.

## Verified Source Analysis

### 1. [MAJOR/missing] src/store/index.js — KV Storage Wrapper (30 lines)

**Current state in ARCHITECTURE.md:** Section 5 exists with basic signatures (`get/set/del/delete`).

**What's missing:** Internal implementation details:
- Uses `agentic-store` with `createStore({ path: '~/.agentic-service/db' })`
- JSON serialization: `set()` calls `JSON.stringify()`, `get()` calls `JSON.parse()`
- `delete` is a named re-export alias for `del`
- Store path: `~/.agentic-service/db` (derived from `os.homedir()`)

**Verified exports:**
```javascript
// src/store/index.js (30 lines)
import { createStore } from 'agentic-store'
import os from 'os'
import path from 'path'

export async function get(key)        // → JSON.parse(raw) or null
export async function set(key, value) // → store.set(key, JSON.stringify(value))
export async function del(key)        // → store.del(key)
export { del as delete }
```

**Action:** Expand §5 with store path, JSON serialization detail, and import.

### 2. [MAJOR/partial] src/runtime/adapters/ — Voice Adapters Detail

**Current state in ARCHITECTURE.md:** Section 11 lists adapters as one-line comments.

**What's missing:** Each voice adapter's actual signature, config source, and behavior:

```javascript
// src/runtime/adapters/voice/openai-tts.js (25 lines)
export async function synthesize(text) → Buffer
// Config: reads ~/.agentic-service/config.json for API key
// Model: tts-1, voice: alloy (default)
// Returns: WAV audio buffer

// src/runtime/adapters/voice/openai-whisper.js (10 lines)
export async function transcribe(buffer) → string
// Requires: OPENAI_API_KEY env var
// Model: whisper-1

// src/runtime/adapters/voice/piper.js (120 lines)
export async function synthesize(text) → Buffer
// Auto-downloads piper binary + voice model on first use
// Binary path: ~/.agentic-service/piper/piper
// Default voice: en_US-lessac-medium
// Custom voice via config.tts.voice

// src/runtime/adapters/voice/elevenlabs.js (49 lines)
export async function synthesize(text) → Buffer
// Config: ~/.agentic-service/config.json or ELEVENLABS_API_KEY env var
// Default voice ID: 21m00Tcm4TlvDq8ikWAM

// src/runtime/adapters/voice/macos-say.js (62 lines)
export async function synthesize(text) → Buffer
export async function listVoices() → string[]
// Output: WAV 16-bit PCM, 22050 Hz
// Uses macOS `say` command

// src/runtime/adapters/sense.js (8 lines)
export function createPipeline(options = {}) → AgenticSense
// Delegates to agentic-sense

// src/runtime/adapters/embed.js (4 lines)
export async function embed(text) → never  // throws "not implemented"
// ⚠️ Dead code stub — actual embedding via runtime/embed.js → agentic-embed
```

**Action:** Expand §11 with per-adapter signatures, config sources, and output formats.

### 3. [MINOR/partial] src/runtime/sense.js — Full API (121 lines)

**Current state in ARCHITECTURE.md:** Section 3 already documents all 10 exports accurately.

**What's missing:** Internal event types and headless mode details:
- Event types: `face_detected`, `gesture_detected`, `object_detected`, `wake_word`
- Headless mode uses `node-record-lpcm16` for microphone + VAD for wake word
- `startHeadless()` returns `EventEmitter` that emits detection events
- Internal: uses `./adapters/sense.js` for pipeline, `./vad.js` for voice detection

**Action:** Add 2-3 lines of internal detail to §3 sense.js entry. Minimal change.

### 4. [MINOR/missing] src/runtime/profiler.js + latency-log.js

**Current state in ARCHITECTURE.md:** Section 3 documents signatures accurately.

**What's missing:** Internal data structures:
```javascript
// profiler.js (30 lines) — internal Map<label, { sum, count, last }>
// getMetrics() returns computed { count, total: sum, avg: sum/count, min, max }
// measurePipeline(stages) runs stages sequentially with startMark/endMark

// latency-log.js (18 lines) — internal Map<stage, number[]>
// p95() sorts samples, returns value at 95th percentile index
// reset() clears all samples
```

**Action:** Add internal data structure comments to §3. Minimal change.

### 5. [MINOR/missing] src/detector/sox.js + src/cli/download-state.js

**Current state in ARCHITECTURE.md:** Section 7 already documents both with correct signatures.

**What's missing:** Platform-specific install commands for sox:
- macOS: `brew install sox`
- Linux: `apt-get install sox` or `yum install sox`

**Action:** Add one line of platform detail to §7 sox entry. Minimal change.

## Implementation Plan

### Files to Modify
- `ARCHITECTURE.md` (architect-owned — this design guides the architect)

### Step-by-step

1. **Expand §5 Store** — Add store path (`~/.agentic-service/db`), JSON serialization note, import from `agentic-store`
2. **Expand §11 Runtime Adapters** — Replace one-line comments with per-adapter blocks showing:
   - Export signature with return type
   - Config source (env var or config file path)
   - Key behavior (auto-download, output format)
3. **Add internal detail to §3 sense.js** — Event types, headless mode internals (2-3 lines)
4. **Add internal detail to §3 profiler.js + latency-log.js** — Data structure shapes (2-3 lines each)
5. **Add platform detail to §7 sox.js** — Install commands per platform (1 line)

### Estimated Impact
- Items 1-2 (MAJOR): Should close ~3-4% of the 5% gap
- Items 3-5 (MINOR): Should close ~1-2% of the remaining gap
- Combined: 85% → ~90%

## Test Cases

1. After changes, every `src/` file should have a corresponding entry in ARCHITECTURE.md (directory tree or module section)
2. All function signatures in ARCHITECTURE.md should match actual source exports
3. No stale references to non-existent files or functions
4. `grep` for each adapter filename in ARCHITECTURE.md should return at least one match with signature

## ⚠️ Unverified Assumptions

- None. All signatures verified against actual source files.
