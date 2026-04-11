# Task Design: 健康检查端点 GET /api/health

**Task:** task-1775893487734
**Module:** Server（HTTP/WebSocket）— ARCHITECTURE.md §3
**Module Design:** `.team/designs/server.design.md`
**DBB Criteria:** DBB-001, DBB-002, DBB-003, DBB-012

## Overview

Add a `GET /api/health` route that returns per-component status. The existing `GET /health` (api.js line 75) stays as a simple liveness probe. The new `/api/health` is the detailed readiness probe.

## Files to Modify

| File | Action | Lines |
|------|--------|-------|
| `src/server/api.js` | Add `GET /api/health` route after line 75 | ~30 lines added |
| `test/server/m103-health.test.js` | Create | ~80 lines |

## Implementation Plan

### Step 1: Add `/api/health` route in `addRoutes(r)` after line 75

```javascript
r.get('/api/health', async (req, res) => {
  const start = Date.now();

  // Ollama — reuse getOllamaStatus() (api.js line 59, has 2s AbortSignal.timeout)
  const ollamaResult = await getOllamaStatus();
  const ollama = ollamaResult.running
    ? { status: 'ok', models: ollamaResult.models }
    : { status: 'degraded', error: ollamaResult.error };

  // STT — check engine registry for stt-capable models
  let sttStatus;
  try {
    const sttModels = await modelsForCapability('stt');
    sttStatus = sttModels.length > 0
      ? { status: 'ok', models: sttModels.map(m => m.id) }
      : { status: 'unavailable' };
  } catch {
    sttStatus = { status: 'unavailable' };
  }

  // TTS — check engine registry for tts-capable models
  let ttsStatus;
  try {
    const ttsModels = await modelsForCapability('tts');
    ttsStatus = ttsModels.length > 0
      ? { status: 'ok', models: ttsModels.map(m => m.id) }
      : { status: 'unavailable' };
  } catch {
    ttsStatus = { status: 'unavailable' };
  }

  // Top-level status reflects degraded components (DBB-002)
  const overall = ollama.status === 'ok' ? 'ok' : 'degraded';

  res.json({
    status: overall,
    uptime: process.uptime(),
    ollama,
    stt: sttStatus,
    tts: ttsStatus,
    responseTime: Date.now() - start,
  });
});
```

### Key Design Decisions

1. **New route `/api/health`** — DBB-001/002/003 all specify `GET /api/health`. Keep existing `GET /health` as simple liveness probe for backward compat.

2. **Always HTTP 200** — DBB-002 says "still returns HTTP 200" even when degraded. The `status` field distinguishes `'ok'` vs `'degraded'`.

3. **`modelsForCapability()` for STT/TTS** — More accurate than checking `getEngines()` capabilities array, because `modelsForCapability()` calls `discoverModels()` which checks each engine's `status().available` before listing models. Already imported at api.js line 16.

4. **Reuse `getOllamaStatus()`** — Already has 2s `AbortSignal.timeout(2000)` (line 63), ensuring DBB-012 compliance.

5. **No new imports** — `modelsForCapability` already imported (line 16), `getOllamaStatus` defined locally (line 59).

### Verified APIs

- `getOllamaStatus()` — api.js line 59 → `{ running: boolean, models: string[], host: string, error?: string }`
- `modelsForCapability(cap)` — registry.js line 113 → `Array<{ id, name, engineId, capabilities, ... }>`

### Step 2: Test file `test/server/m103-health.test.js`

Test cases:
1. **DBB-001**: `GET /api/health` → 200, body has `ollama`, `stt`, `tts` fields with `status` subfield
2. **DBB-002**: Mock `getOllamaStatus` → `{ running: false }` → top-level `status === 'degraded'`, `ollama.status === 'degraded'`
3. **DBB-003**: Empty engine registry → `stt.status === 'unavailable'`, `tts.status === 'unavailable'`, HTTP still 200
4. **DBB-012**: Response time < 2000ms

## ⚠️ Unverified Assumptions

None — all APIs verified from source.
