# Design: Fix config JSON parse error on atomic write

**Module:** Config (ARCHITECTURE.md §config.js)
**Module Design:** `.team/designs/server.design.md` (config dependency)

## Root Cause

`_writeToDisk()` (src/config.js:320-337) uses a fixed temp path `CONFIG_PATH + '.tmp'`. When multiple `setConfig()` calls run concurrently (e.g., rapid API PUTs), two calls can:

1. Call A writes JSON-A to `config.json.tmp`
2. Call B writes JSON-B to `config.json.tmp` (overwrites A's data)
3. Call A renames `config.json.tmp` → `config.json` (now contains B's data, not A's)
4. Call B tries to rename `config.json.tmp` → ENOENT (file already renamed by A)

Or worse: partial write interleaving produces corrupt JSON.

## Fix

Add a write mutex to `setConfig()` so writes are serialized. This is the simplest correct fix — no need for unique temp files or retry logic.

### Files to Modify

**src/config.js** — 2 changes:

#### 1. Add a simple promise-based mutex (after line 29)

```javascript
let _writeQueue = Promise.resolve();
```

#### 2. Wrap `setConfig` body in the queue (lines 43-51)

Replace current `setConfig`:
```javascript
export async function setConfig(updates) {
  const current = await getConfig();
  const merged = deepMerge(current, updates);
  await _writeToDisk(merged);
  _cache = merged;
  for (const fn of _listeners) {
    try { fn(merged); } catch (e) { console.warn('[config] listener error:', e.message); }
  }
}
```

With queued version:
```javascript
export function setConfig(updates) {
  _writeQueue = _writeQueue.then(async () => {
    const current = await getConfig();
    const merged = deepMerge(current, updates);
    await _writeToDisk(merged);
    _cache = merged;
    for (const fn of _listeners) {
      try { fn(merged); } catch (e) { console.warn('[config] listener error:', e.message); }
    }
  });
  return _writeQueue;
}
```

This ensures each `setConfig` call waits for the previous one to finish before reading + writing.

#### 3. Same treatment for `initFromProfile` (lines 56-72)

Wrap in `_writeQueue` to prevent races during setup.

### Test Cases

- Existing test `multiple sequential writes produce valid JSON each time` should continue passing
- Existing test `multiple rapid PUTs all persist correctly` should now pass (was getting 500)
- No new tests needed — the existing tests already cover this scenario

### ⚠️ Notes

- `setConfig` return type changes from `Promise<void>` to `Promise<void>` (same) — but internally it's now chained. Callers already `await` it, so no breaking change.
- This fix also resolves task-1775852942672 (rapid PUTs 500) since both share the same root cause.
- `_writeToDisk` itself doesn't need changes — the ENOENT retry logic added in the previous fix is still useful for first-run scenarios.
