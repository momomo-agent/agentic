# Module Design: Engine（多引擎注册中心）

**ARCHITECTURE.md Section:** §2 Engine（多引擎注册中心）
**Status:** ready-for-review

## Overview

The Engine module manages engine registration, model discovery, and model routing. M103 extends it with health checking and retry logic.

## Verified Exports (from source, 2026-04-11)

### registry.js (src/engine/registry.js, 131 lines)
```javascript
export function register(id, engine)                    // line 26
export function unregister(id)                          // line 30
export function getEngines()                            // line 37 → [{ id, ...engine }]
export function getEngine(id)                           // line 44 → engine | null
export async function discoverModels()                  // line 52 → Model[]
export async function resolveModel(modelId)             // line 83 → { engineId, engine, model, provider, modelName } | null
export async function modelsForCapability(cap)          // line 127 → Model[]
```

**Circular dependency handling (IMPLEMENTED):**
- `registry.js` uses lazy dynamic `import('./health.js')` at line 13-18 to get `isHealthy`
- `discoverModels()` and `resolveModel()` both call `isHealthy(engineId)` to skip down engines
- No static circular import — `getIsHealthy()` is async and caches the import

### ollama.js (src/engine/ollama.js, 183 lines) — default export object
```javascript
name: 'Ollama'
async status()                    // line 28 → { available, host } | { available: false, error }
async models()                    // line 40 → Model[]
async pull(modelName)             // line 56 → Response
async delete(modelName)           // line 68 → boolean
recommended()                     // line 80 → Model[]
async *run(modelName, input)      // line 102 → yields { type, ... }
```
- `status()` uses 3s timeout to `${host}/api/tags`
- `run()` has 5s first-token timeout (AbortController), clears on first token
- ⚠️ No retry logic yet (task-1775896028509, status: todo)

### cloud.js (src/engine/cloud.js, 167 lines)
```javascript
export function createCloudEngine(provider, config)     // line 8 → engine object
// Returned engine:
async status()                    // line 40 → { available: !!apiKey, provider }
async models()                    // line 44 → Model[]
recommended()                     // line 55 → Model[]
async *run(modelName, input)      // line 64 → yields { type, ... }
```
- `status()` only checks if apiKey exists (no network call)
- `run()` has no timeout or retry
- Error throws are plain `new Error(...)` without `httpStatus` property
- ⚠️ No retry logic yet (task-1775896028509, status: todo)

### init.js (src/engine/init.js, 47 lines)
```javascript
import { startHealthCheck } from './health.js';         // line 11
export async function initEngines()                     // line 13
```
- Registers: ollama, whisper, tts (always), cloud:* (from config.providers + legacy modelPool)
- Calls `startHealthCheck()` at line 46 after all engines registered

## IMPLEMENTED: health.js (src/engine/health.js, 77 lines)

```javascript
import EventEmitter from 'node:events';
import { getEngines } from './registry.js';

export function startHealthCheck(intervalMs = 30_000)   // line 48 — calls checkAll() immediately + setInterval
export function stopHealthCheck()                        // line 53 — clearInterval
export function getEngineHealth(engineId)                // line 58 → HealthState | default
export function getAllHealth()                            // line 62 → Object.fromEntries(healthState)
export function isHealthy(engineId)                      // line 66 → boolean (true if not 'down')
export function onHealthChange(fn)                       // line 70
export function offHealthChange(fn)                      // line 74
```

### Health State Shape
```javascript
{
  status: 'healthy' | 'degraded' | 'down',
  lastCheck: number,       // Date.now()
  latency: number | null,  // ms for the check
  error: string | null,    // error message if not healthy
}
```

### Check Logic (verified from source)
- For each engine from `getEngines()`, call `engine.status()` with 5s `Promise.race` timeout
- `result.available === true` → `'healthy'`, else → `'down'`
- On status change: emit `'change'` event with `{ engineId, prev, next }`
- Default for unknown engine: `{ status: 'healthy', lastCheck: 0, error: null, latency: null }`

## PENDING: Retry Logic (task-1775896028509)

### ollama.js Changes
- Wrap `run()` generator: on timeout/connection error, retry once after 1s delay
- Only retry on: `AbortError` (timeout), `TypeError` (fetch connection failure), `ECONNREFUSED`
- Log: `console.log('[retry] engine=ollama attempt=2 reason=<error.message>')`

### cloud.js Changes
- Wrap `run()` generator:
  - On HTTP 429: read `Retry-After` header, wait that many seconds, retry up to 3x
  - On HTTP 5xx: exponential backoff 1s→2s→4s, retry up to 3x
- Must add `httpStatus` and `retryAfter` properties to error objects in `_runInner()`
- Log: `console.log('[retry] engine=cloud:<provider> attempt=N reason=<status>')`

### Retry Implementation Pattern
```javascript
// Inline in each file, not a separate module
async function* withRetry(fn, { maxRetries, shouldRetry, getDelay, engineName }) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      yield* fn();
      return;
    } catch (err) {
      lastError = err;
      if (attempt > maxRetries || !shouldRetry(err)) throw err;
      const delay = getDelay(err, attempt);
      console.log(`[retry] engine=${engineName} attempt=${attempt + 1} reason=${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
```

## Constraints

- health.js timer must be stoppable (for graceful shutdown and tests)
- Retry logic must be transparent to callers — same generator interface
- Cloud retry must respect Retry-After header (seconds, not ms)
- No retry on 4xx errors (except 429)
- Lazy dynamic import in registry.js avoids circular dependency at module load time
