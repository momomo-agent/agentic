# Task Design: stt.js 切到 Engine Registry

**Task ID:** task-1775887201601
**Module:** Runtime（服务运行时） — ARCHITECTURE.md §2
**Module Design:** `.team/designs/runtime.design.md`

## Current State (verified from source)

`src/runtime/stt.js` (51 lines) currently:

**Imports (lines 1-4):**
```javascript
import { detect } from '../detector/hardware.js';
import { getProfile } from '../detector/profiles.js';
import { startMark, endMark } from './profiler.js';
import { record } from './latency-log.js';
```

**Init flow (lines 14-38):**
1. Calls `detect()` → `getProfile(hardware)` → reads `profile.stt.provider`
2. Loads adapter from hardcoded `ADAPTERS` map: `{ sensevoice, whisper, default }`
3. Runs `adapter.check()` if available
4. On failure: fallback chain `sensevoice → whisper → openai`

**Problem:** stt.js directly depends on `detector/hardware.js` and `detector/profiles.js`. It should instead use `config.assignments.stt` to find the assigned model, then resolve it through the Engine Registry.

### Whisper Engine (verified from src/engine/whisper.js):
```javascript
export default {
  name: 'Whisper',
  async status() → { available, backend: 'sensevoice' | 'whisper-cpp' | null }
  async models() → [{ id, name, capabilities: ['stt'], installed }]
  recommended() → WHISPER_MODELS
  // ⚠️ NO run() method yet
}
```

### Config assignments (verified from src/config.js line 30):
```javascript
assignments: { chat: null, vision: null, stt: null, tts: null, embedding: null, chatFallback: null }
```

## Design

### Step 1: Add `run()` to Whisper engine

**File:** `src/engine/whisper.js`
**Add after `recommended()` (line 65):**

```javascript
/**
 * Run STT transcription via the detected backend
 * @param {string} modelName - e.g. "sensevoice", "whisper:small"
 * @param {object} input - { audioBuffer: Buffer }
 * @returns {Promise<string>} transcribed text
 */
async run(modelName, input) {
  const s = await this.status();
  if (!s.available) throw new Error('No STT backend available');

  if (s.backend === 'sensevoice' || modelName === 'sensevoice') {
    const { transcribe } = await import('../runtime/adapters/voice/sensevoice.js');
    return transcribe(input.audioBuffer);
  }
  // whisper-cpp
  const { transcribe } = await import('../runtime/adapters/voice/whisper.js');
  return transcribe(input.audioBuffer);
},
```

### Step 2: Add `run()` to Cloud engine for STT

Cloud engines with `stt` capability (e.g., `cloud:openai` with `whisper-1`) need to handle STT.

**File:** `src/engine/cloud.js`
**Add to `run()` method (from task-1775887196225 design):**

```javascript
// Inside run(), before chat logic:
if (input.audioBuffer) {
  // STT mode — only OpenAI supports this currently
  if (provider !== 'openai') throw new Error(`${provider} does not support STT`);
  const endpoint = url || 'https://api.openai.com/v1';
  const formData = new FormData();
  formData.append('file', new Blob([input.audioBuffer]), 'audio.wav');
  formData.append('model', modelName);
  const res = await fetch(`${endpoint}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`OpenAI STT HTTP ${res.status}`);
  const data = await res.json();
  return data.text;
}
```

### Step 3: Rewrite stt.js init() to use Engine Registry

**File:** `src/runtime/stt.js`

**Replace entire file:**
```javascript
import { getConfig } from '../config.js';
import { resolveModel, modelsForCapability } from '../engine/registry.js';
import { startMark, endMark } from './profiler.js';
import { record } from './latency-log.js';

// Legacy adapter map — used only when no engine assignment exists
const LEGACY_ADAPTERS = {
  sensevoice: () => import('./adapters/voice/sensevoice.js'),
  whisper:    () => import('./adapters/voice/whisper.js'),
  default:    () => import('./adapters/voice/openai-whisper.js'),
};

let _resolved = null;   // { engine, modelName } from registry
let _adapter = null;     // legacy adapter fallback

export async function init() {
  const config = await getConfig();
  const modelId = config.assignments?.stt;

  if (modelId) {
    const resolved = await resolveModel(modelId);
    if (resolved?.engine?.run) {
      _resolved = resolved;
      return;
    }
  }

  // No assignment or engine lacks run() — try engine discovery
  const sttModels = await modelsForCapability('stt');
  if (sttModels.length > 0) {
    const best = sttModels[0]; // first available
    const resolved = await resolveModel(best.id);
    if (resolved?.engine?.run) {
      _resolved = resolved;
      return;
    }
  }

  // Final fallback: legacy adapter chain (detect → profile → adapter)
  let provider = 'default';
  try {
    if (config.stt?.provider) {
      provider = config.stt.provider;
    }
  } catch {}

  const load = LEGACY_ADAPTERS[provider] ?? LEGACY_ADAPTERS.default;
  try {
    _adapter = await load();
    if (_adapter.check) await _adapter.check();
  } catch {
    const fallbacks = ['sensevoice', 'whisper', 'default'].filter(k => k !== provider);
    for (const fb of fallbacks) {
      try {
        _adapter = await LEGACY_ADAPTERS[fb]();
        if (_adapter.check) await _adapter.check();
        break;
      } catch { _adapter = null; }
    }
    if (!_adapter) _adapter = await LEGACY_ADAPTERS.default();
  }
}

export async function transcribe(audioBuffer) {
  if (!_resolved && !_adapter) throw new Error('not initialized');
  if (!audioBuffer || audioBuffer.length === 0)
    throw Object.assign(new Error('empty audio'), { code: 'EMPTY_AUDIO' });

  startMark('stt');
  const t0 = Date.now();

  let result;
  if (_resolved) {
    result = await _resolved.engine.run(_resolved.modelName, { audioBuffer });
  } else {
    result = await _adapter.transcribe(audioBuffer);
  }

  transcribe._lastMs = endMark('stt');
  record('stt', Date.now() - t0);
  return result;
}
```

## Files to Modify

| File | Action | Lines |
|------|--------|-------|
| `src/engine/whisper.js` | Add `async run()` method | After line 65 |
| `src/engine/cloud.js` | Add STT branch to `run()` | Inside run() method |
| `src/runtime/stt.js` | Rewrite: remove detector imports, use registry | Full rewrite (51 → ~60 lines) |

## Key Changes

1. **No more `import { detect }` or `import { getProfile }`** — stt.js no longer touches detector/
2. **Priority chain:** `assignments.stt` → `modelsForCapability('stt')` → legacy adapter fallback
3. **Legacy fallback reads `config.stt.provider`** instead of calling `detect()`/`getProfile()` — this is already in config from setup
4. **Public API unchanged:** `init()` and `transcribe(audioBuffer)` signatures identical

## Test Cases

1. **stt.js does not import detector/** — static import check (grep for `detector/`)
2. **init() with assignments.stt set** — mock `resolveModel` to return engine with `run()`, verify `_resolved` is set
3. **init() without assignment falls back to engine discovery** — mock `modelsForCapability('stt')` to return models
4. **init() final fallback uses legacy adapters** — no engines available, verify adapter loaded from `config.stt.provider`
5. **transcribe() delegates to engine.run()** — when `_resolved` is set, verify `engine.run(modelName, { audioBuffer })` called
6. **transcribe() delegates to adapter.transcribe()** — when only `_adapter` is set
7. **Existing tests pass** — `test/runtime/m38-stt.test.js`, `test/runtime/stt-adaptive.test.js`

## ⚠️ Unverified Assumptions

- `modelsForCapability('stt')` returns models sorted by preference — currently it returns all models with 'stt' capability in engine registration order (ollama first, then whisper, then cloud). This is acceptable: whisper engine's sensevoice/whisper-cpp models will appear before cloud:openai's whisper-1.
- Cloud STT via FormData assumes Node.js 18+ global `FormData` and `Blob` — verified: Node 18+ has these globally.
