# Task Design: 清理死文件和重复路由

**Task ID:** task-1775887206320
**Module:** Server（HTTP/WebSocket） — ARCHITECTURE.md §3 + UI
**Module Design:** `.team/designs/server.design.md`
**Blocked by:** task-1775887196225, task-1775887201601, task-1775887201640

## Current State (verified from source + explore agent)

### Dead Files (confirmed unreferenced)

| File | Exists | Imported Anywhere | Verdict |
|------|--------|-------------------|---------|
| `src/ui/admin/src/views/LocalModelsView.vue` | ✅ (308 lines) | ❌ Not in App.vue or router | DELETE |
| `src/ui/admin/src/views/CloudModelsView.vue` | ✅ (276 lines) | ❌ Not in App.vue or router | DELETE |
| `src/ui/admin/src/App-old.vue` | ✅ | ❌ Not referenced anywhere | DELETE |
| `src/ui/admin/src/components/ConfigPanel.vue` | ✅ (30 lines) | ❌ Not imported anywhere | DELETE |
| `src/runtime/memory.js` | ✅ (58 lines) | ❌ Not imported in server/, index.js, or any other file | DELETE |

### Duplicate Routes in api.js (verified from src/server/api.js)

**`/api/ollama/*` routes (lines 638-691)** duplicate functionality now in `/api/engines/*`:

| Old Route | Line | New Equivalent | Notes |
|-----------|------|----------------|-------|
| `GET /api/ollama/tags` | 638 | `GET /api/engines/models` (line 614) | engines/models returns ALL models including Ollama |
| `POST /api/ollama/pull` | 651 | Ollama engine's `pull()` method | Need to add `/api/engines/pull` route |
| `DELETE /api/ollama/delete` | 677 | Ollama engine's `delete()` method | Need to add `/api/engines/delete` route |

**`/api/model-pool` routes (lines 279-307):**

| Route | Line | Action |
|-------|------|--------|
| `GET /api/model-pool` | 279 | Proxy to `GET /api/engines/models` + deprecation header |
| `POST /api/model-pool` | 287 | Keep as-is (adds to config.modelPool, different from engine discovery) |
| `DELETE /api/model-pool/:id` | 300 | Keep as-is (removes from config.modelPool) |

## Design

### Step 1: Delete dead files

```bash
rm src/ui/admin/src/views/LocalModelsView.vue
rm src/ui/admin/src/views/CloudModelsView.vue
rm src/ui/admin/src/App-old.vue
rm src/ui/admin/src/components/ConfigPanel.vue
rm src/runtime/memory.js
```

### Step 2: Add engine pull/delete routes to api.js

**File:** `src/server/api.js`
**Add after `/api/engines/recommended` route (line 635):**

```javascript
// Pull model via engine
r.post('/api/engines/pull', async (req, res) => {
  try {
    const { model } = req.body;
    if (!model) return res.status(400).json({ error: 'model required' });
    // Currently only Ollama supports pull
    const engine = getEngine('ollama');
    if (!engine) return res.status(404).json({ error: 'ollama engine not available' });
    const resp = await engine.pull(model);
    res.setHeader('Content-Type', 'application/x-ndjson');
    const reader = resp.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Delete model via engine
r.delete('/api/engines/models/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const engine = getEngine('ollama');
    if (!engine) return res.status(404).json({ error: 'ollama engine not available' });
    const ok = await engine.delete(name);
    if (ok) res.json({ ok: true });
    else res.status(500).json({ error: 'delete failed' });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});
```

### Step 3: Remove `/api/ollama/*` routes

**File:** `src/server/api.js`
**Delete lines 637-691** (the three `/api/ollama/*` route handlers).

### Step 4: Add deprecation proxy for `GET /api/model-pool`

**File:** `src/server/api.js`
**Replace `GET /api/model-pool` handler (line 279):**

```javascript
r.get('/api/model-pool', async (req, res) => {
  res.setHeader('X-Deprecated', 'Use GET /api/engines/models instead');
  res.setHeader('Deprecation', 'true');
  try {
    const models = await discoverModels();
    res.json(models);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

`POST /api/model-pool` and `DELETE /api/model-pool/:id` stay unchanged — they manage the user's config.modelPool (adding/removing cloud API keys), which is different from engine model discovery.

### Step 5: Remove unused import if applicable

After the 3 P0 tasks complete, check if `getModelPool` is still imported in api.js. If brain.js no longer needs it and api.js's `POST/DELETE /api/model-pool` still uses `addToPool`/`removeFromPool`, then `getModelPool` can be removed from api.js imports only if `GET /api/model-pool` no longer calls it (which it won't after step 4).

**File:** `src/server/api.js` line 15
```javascript
// BEFORE:
import { getConfig, setConfig, reloadConfig, CONFIG_PATH, getModelPool, addToPool, removeFromPool, getAssignments, setAssignments } from '../config.js';

// AFTER:
import { getConfig, setConfig, reloadConfig, CONFIG_PATH, addToPool, removeFromPool, getAssignments, setAssignments } from '../config.js';
```

⚠️ Only remove `getModelPool` if no other usage remains in api.js. Grep first.

## Files to Modify

| File | Action |
|------|--------|
| `src/ui/admin/src/views/LocalModelsView.vue` | DELETE |
| `src/ui/admin/src/views/CloudModelsView.vue` | DELETE |
| `src/ui/admin/src/App-old.vue` | DELETE |
| `src/ui/admin/src/components/ConfigPanel.vue` | DELETE |
| `src/runtime/memory.js` | DELETE |
| `src/server/api.js` | Add engine pull/delete routes, remove `/api/ollama/*`, deprecate `GET /api/model-pool`, clean imports |

## Test Cases

1. **Dead files deleted** — verify files don't exist after cleanup
2. **All existing tests pass** — `pnpm test` (no test imports any of the dead files)
3. **`GET /api/engines/models`** — returns model list (existing test coverage)
4. **`POST /api/engines/pull`** — mock Ollama engine, verify streaming response
5. **`DELETE /api/engines/models/:name`** — mock Ollama engine, verify delete
6. **`GET /api/model-pool`** — returns `X-Deprecated` header + `Deprecation: true` header
7. **`POST /api/model-pool`** — still works (unchanged)
8. **`/api/ollama/*` routes removed** — 404 on `GET /api/ollama/tags`
9. **No import of `getModelPool` in api.js** — if confirmed unused after P0 tasks

## ⚠️ Unverified Assumptions

- No admin UI code references `/api/ollama/*` endpoints — need to grep `src/ui/admin/` for `ollama/tags`, `ollama/pull`, `ollama/delete` before removing. If admin UI uses them, update those fetch calls to use `/api/engines/*` equivalents.
- `runtime/memory.js` has a test file `test/m87-semantic-memory.test.js` — this test file should also be deleted or updated to remove the import. Check before running tests.
