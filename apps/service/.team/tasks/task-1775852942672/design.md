# Design: Fix rapid PUTs return 500

**Module:** Server (ARCHITECTURE.md §3) + Config (config.js)
**Module Design:** `.team/designs/server.design.md`

## Root Cause

Same as task-1775852942421. The `PUT /api/config` endpoint (src/server/api.js:269-276) calls `setConfig(req.body)` which calls `_writeToDisk()`. Multiple rapid PUTs race on the shared temp file `config.json.tmp`, causing ENOENT or corrupt JSON, which surfaces as a 500 error.

## Fix

**No changes needed in api.js.** The fix is entirely in `src/config.js` — adding a write mutex to `setConfig()` as described in task-1775852942421's design.

Once `setConfig` serializes writes via `_writeQueue`, rapid PUTs will queue up and execute one at a time. Each will succeed and return `{ ok: true }`.

### Files to Modify

**src/config.js** — see task-1775852942421/design.md for exact changes.

No changes to src/server/api.js — the endpoint already has try/catch and returns 500 on error. Once the underlying race is fixed, no errors will occur.

### Test Cases

- `multiple rapid PUTs all persist correctly` — should pass (5 sequential PUTs, final GET returns last value)
- All existing config-persistence tests should continue passing

### ⚠️ Notes

- This task shares the same root cause and fix as task-1775852942421. Implementing either design fixes both.
