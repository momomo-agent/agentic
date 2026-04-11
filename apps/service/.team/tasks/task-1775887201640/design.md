# Task Design: tts.js 切到 Engine Registry

**Task ID:** task-1775887201640
**Module:** Runtime（服务运行时） — ARCHITECTURE.md §2
**Module Design:** `.team/designs/runtime.design.md`

## Current State (verified from source)

`src/runtime/tts.js` (71 lines) currently:

**Imports (lines 1-4, 15-17):**
```javascript
import { detect } from '../detector/hardware.js';
import { getProfile } from '../detector/profiles.js';
import { startMark, endMark } from './profiler.js';
import { record } from './latency-log.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
```

**Init flow (lines 23-59):**
1. Reads `~/.agentic-service/config.json` directly via `fs.readFile` (line 27-28)
2. If `config.tts.provider` exists, uses it
3. Otherwise calls `detect()` → `getProfile(hardware)` → `profile.tts.provider`
4. Platform default: `macos-say` on darwin, `default` (openai-tts) elsewhere
5. Loads adapter from hardcoded `ADAPTERS` map

**Problems:**
- Directly reads config file instead of using `getConfig()`
- Depends on `detector/hardware.js` and `detector/profiles.js`
- Should use `config.assignments.tts` → Engine Registry

### TTS Engine (verified from src/engine/tts.js):
```javascript
export default {
  name: 'TTS',
  async status() → { available: true }
  async models() → [{ id: 'macos-say'|'kokoro'|'piper', capabilities: ['tts'] }]
  recommended() → TTS_MODELS
  // ⚠️ NO run() method yet
}
```

### Adapter map (verified from tts.js lines 6-13):
```javascript
const ADAPTERS = {
  'macos-say': () => import('./adapters/voice/macos-say.js'),
  piper:       () => import('./adapters/voice/piper.js'),
  kokoro:      () => import('./adapters/voice/kokoro.js'),
  elevenlabs:  () => import('./adapters/voice/elevenlabs.js'),
  openai:      () => import('./adapters/voice/openai-tts.js'),
  default:     () => import('./adapters/voice/openai-tts.js'),
};
```

## Design

### Step 1: Add `run()` to TTS engine

**File:** `src/engine/tts.js`
**Add after `recommended()` (line 39):**

```javascript
/**
 * Run TTS synthesis via the specified backend
 * @param {string} modelName - e.g. "kokoro", "macos-say", "piper"
 * @param {object} input - { text: string }
 * @returns {Promise<Buffer>} audio buffer
 */
async run(modelName, input) {
  const adapterMap = {
    'macos-say': () => import('../runtime/adapters/voice/macos-say.js'),
    piper:       () => import('../runtime/adapters/voice/piper.js'),
    kokoro:      () => import('../runtime/adapters/voice/kokoro.js'),
    elevenlabs:  () => import('../runtime/adapters/voice/elevenlabs.js'),
    openai:      () => import('../runtime/adapters/voice/openai-tts.js'),
  };
  const load = adapterMap[modelName];
  if (!load) throw new Error(`Unknown TTS model: ${modelName}`);
  const mod = await load();
  const adapter = mod.synthesize ? mod : mod.default;
  return adapter.synthesize(input.text);
},
```

### Step 2: Add TTS branch to Cloud engine run()

Cloud engines with `tts` capability (e.g., `cloud:openai` with `tts-1`).

**File:** `src/engine/cloud.js`
**Add to `run()` method (from task-1775887196225 design), before chat logic:**

```javascript
// TTS mode
if (input.text !== undefined && !input.messages) {
  if (provider !== 'openai') throw new Error(`${provider} does not support TTS`);
  const endpoint = url || 'https://api.openai.com/v1';
  const res = await fetch(`${endpoint}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ model: modelName, input: input.text, voice: input.voice || 'alloy' }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
```

### Step 3: Rewrite tts.js init() to use Engine Registry

**File:** `src/runtime/tts.js`

**Replace entire file:**
```javascript
import { getConfig } from '../config.js';
import { resolveModel, modelsForCapability } from '../engine/registry.js';
import { startMark, endMark } from './profiler.js';
import { record } from './latency-log.js';

// Legacy adapter map — used only when no engine assignment exists
const LEGACY_ADAPTERS = {
  'macos-say': () => import('./adapters/voice/macos-say.js'),
  piper:       () => import('./adapters/voice/piper.js'),
  kokoro:      () => import('./adapters/voice/kokoro.js'),
  elevenlabs:  () => import('./adapters/voice/elevenlabs.js'),
  openai:      () => import('./adapters/voice/openai-tts.js'),
  default:     () => import('./adapters/voice/openai-tts.js'),
};

let _resolved = null;   // { engine, modelName } from registry
let _adapter = null;     // legacy adapter fallback

export async function init() {
  const config = await getConfig();
  const modelId = config.assignments?.tts;

  if (modelId) {
    const resolved = await resolveModel(modelId);
    if (resolved?.engine?.run) {
      _resolved = resolved;
      return;
    }
  }

  // No assignment — try engine discovery
  const ttsModels = await modelsForCapability('tts');
  if (ttsModels.length > 0) {
    const best = ttsModels[0];
    const resolved = await resolveModel(best.id);
    if (resolved?.engine?.run) {
      _resolved = resolved;
      return;
    }
  }

  // Final fallback: legacy adapter chain
  let provider = config.tts?.provider
    ?? (process.platform === 'darwin' ? 'macos-say' : 'default');

  const load = LEGACY_ADAPTERS[provider] ?? LEGACY_ADAPTERS.default;
  try {
    const mod = await load();
    _adapter = mod.synthesize ? mod : mod.default;
  } catch {
    const mod = await LEGACY_ADAPTERS.default();
    _adapter = mod.synthesize ? mod : mod.default;
  }
}

export async function synthesize(text) {
  if (!_resolved && !_adapter) throw new Error('not initialized');
  if (!text || !text.trim())
    throw Object.assign(new Error('text required'), { code: 'EMPTY_TEXT' });

  startMark('tts');
  const t0 = Date.now();

  let result;
  if (_resolved) {
    result = await _resolved.engine.run(_resolved.modelName, { text });
  } else {
    result = await _adapter.synthesize(text);
  }

  synthesize._lastMs = endMark('tts');
  record('tts', Date.now() - t0);
  return result;
}
```

## Files to Modify

| File | Action | Lines |
|------|--------|-------|
| `src/engine/tts.js` | Add `async run()` method | After line 39 |
| `src/engine/cloud.js` | Add TTS branch to `run()` | Inside run() method |
| `src/runtime/tts.js` | Rewrite: remove detector + fs imports, use registry | Full rewrite (71 → ~55 lines) |

## Key Changes

1. **No more `import { detect }` or `import { getProfile }`** — tts.js no longer touches detector/
2. **No more direct `fs.readFile` of config** — uses `getConfig()` from config.js
3. **Priority chain:** `assignments.tts` → `modelsForCapability('tts')` → legacy adapter fallback
4. **Legacy fallback reads `config.tts.provider`** — already populated by setup wizard
5. **Public API unchanged:** `init()` and `synthesize(text)` signatures identical

## Test Cases

1. **tts.js does not import detector/** — static import check (grep for `detector/`)
2. **tts.js does not import fs/path/os** — no more direct config file reading
3. **init() with assignments.tts set** — mock `resolveModel` to return engine with `run()`, verify `_resolved` is set
4. **init() without assignment falls back to engine discovery** — mock `modelsForCapability('tts')`
5. **init() final fallback uses config.tts.provider** — no engines, verify adapter loaded
6. **synthesize() delegates to engine.run()** — when `_resolved` is set
7. **synthesize() delegates to adapter.synthesize()** — when only `_adapter` is set
8. **Platform default: macos-say on darwin** — no config, no engines, verify macos-say selected on darwin
9. **Existing tests pass** — `test/runtime/m38-tts.test.js`, `test/runtime/stt-tts-adaptive.test.js`

## ⚠️ Unverified Assumptions

- TTS engine `run()` imports adapters from `../runtime/adapters/voice/` — this creates a circular-ish dependency (engine → runtime adapter). Acceptable because it's a dynamic import and the adapter files are leaf modules with no back-imports.
- `modelsForCapability('tts')` returns local models first (tts engine's kokoro/piper/macos-say before cloud:openai's tts-1) — verified: engine registration order in init.js is `tts` before `cloud:*`.
