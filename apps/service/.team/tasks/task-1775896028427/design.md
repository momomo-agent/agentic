# Task Design: 引擎健康检查 + 自动降级 (health.js)

**Task ID:** task-1775896028427
**Module:** Engine (ARCHITECTURE.md §2)
**Module Design:** `.team/designs/engine.design.md`

## Files to Create

### `src/engine/health.js` (NEW)

## Files to Modify

### `src/server/api.js`
- Add `GET /api/engines/health` route in `addRoutes(r)` (after line ~777)
- Import `getAllHealth` from `../engine/health.js`

### `src/engine/registry.js`
- Import `isHealthy` from `./health.js` in `resolveModel()` to skip down engines
- Add early continue: `if (!isHealthy(engineId)) continue;` in the engine loop (line 76)

### `src/engine/init.js`
- Import and call `startHealthCheck()` after engine registration (line 44)

## Function Signatures

```javascript
// src/engine/health.js
import EventEmitter from 'node:events';
import { getEngines } from './registry.js';

const emitter = new EventEmitter();
const healthState = new Map();  // engineId → HealthState
let timer = null;

/**
 * @typedef {{ status: 'healthy'|'degraded'|'down', lastCheck: number, latency: number|null, error: string|null }} HealthState
 */

export function startHealthCheck(intervalMs = 30_000)
// Calls checkAll() immediately, then setInterval(checkAll, intervalMs)
// Returns void

export function stopHealthCheck()
// clearInterval(timer); timer = null
// Returns void

export function getEngineHealth(engineId)
// Returns healthState.get(engineId) || { status: 'healthy', lastCheck: 0, error: null, latency: null }

export function getAllHealth()
// Returns Object.fromEntries(healthState)

export function isHealthy(engineId)
// Returns healthState.get(engineId)?.status !== 'down'
// Default (no entry) = healthy (engines are healthy until proven otherwise)

export function onHealthChange(fn)
// emitter.on('change', fn)

export function offHealthChange(fn)
// emitter.off('change', fn)
```

### Internal: `checkAll()`
```javascript
async function checkAll() {
  const engines = getEngines();  // [{ id, status(), ... }]
  for (const engine of engines) {
    const start = Date.now();
    try {
      const result = await engine.status();
      const latency = Date.now() - start;
      const prev = healthState.get(engine.id);
      const next = {
        status: result.available ? 'healthy' : 'down',
        lastCheck: Date.now(),
        latency,
        error: result.available ? null : (result.error || 'unavailable'),
      };
      healthState.set(engine.id, next);
      if (prev && prev.status !== next.status) {
        emitter.emit('change', { engineId: engine.id, prev: prev.status, next: next.status });
      }
    } catch (err) {
      const prev = healthState.get(engine.id);
      const next = { status: 'down', lastCheck: Date.now(), latency: null, error: err.message };
      healthState.set(engine.id, next);
      if (prev && prev.status !== next.status) {
        emitter.emit('change', { engineId: engine.id, prev: prev.status, next: next.status });
      }
    }
  }
}
```

### API Route: `GET /api/engines/health`
```javascript
r.get('/api/engines/health', (_req, res) => {
  res.json(getAllHealth());
});
```

## Step-by-Step Implementation

1. Create `src/engine/health.js` with all exports above
2. Add `GET /api/engines/health` route in `src/server/api.js`
   - Import: `import { getAllHealth } from '../engine/health.js';`
   - Add route after existing `/api/engines/recommended` block (~line 777)
3. Modify `src/engine/registry.js`:
   - Add import: `import { isHealthy } from './health.js';`
   - In `resolveModel()` loop (line 75): add `if (!isHealthy(engineId)) continue;`
   - In `discoverModels()` loop (line 44): add `if (!isHealthy(engineId)) continue;`
4. Modify `src/engine/init.js`:
   - Add import: `import { startHealthCheck } from './health.js';`
   - After line 44 (console.log): add `startHealthCheck();`

## Test Cases

```javascript
// tests/engine/health.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startHealthCheck, stopHealthCheck, getEngineHealth, getAllHealth, isHealthy, onHealthChange, offHealthChange } from '../../src/engine/health.js';

// Test 1: startHealthCheck runs initial check and populates state
// Test 2: getEngineHealth returns default for unknown engine
// Test 3: isHealthy returns false when engine status().available = false
// Test 4: health change event emitted on status transition
// Test 5: stopHealthCheck clears timer
// Test 6: getAllHealth returns all engine states
```

## ⚠️ Unverified Assumptions

- Circular import: `health.js → registry.js (getEngines)` and `registry.js → health.js (isHealthy)`. Node.js ESM handles this if both modules export before importing each other's values. Verified: `getEngines()` reads from `engines` Map (populated by `register()`), `isHealthy()` reads from `healthState` Map. Both are sync reads of module-level Maps — no initialization-order issue.
- `engine.status()` timeout: Ollama has 3s timeout built-in. Cloud `status()` is sync (checks apiKey). Whisper/TTS engines need verification — if they have no timeout, `checkAll()` could hang. Mitigation: wrap each `engine.status()` call with `Promise.race([status(), timeout(5000)])`.
