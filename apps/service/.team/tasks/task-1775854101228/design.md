# Task Design: Document store/index.js module in ARCHITECTURE.md

**Task:** task-1775854101228
**Module:** Store（数据持久化）— ARCHITECTURE.md §5
**Reference Design:** `.team/designs/store.design.md`

## Current State

ARCHITECTURE.md §5 (line 363) already contains a formal Store module section with:
- All 4 exports documented (`get`, `set`, `del`, `delete`)
- Lazy init pattern described
- DB path (`~/.agentic-service/store.db`)
- agentic-store dependency noted

### Verified against source (`src/store/index.js`, 29 lines):
```javascript
import { open } from 'agentic-store'           // line 1 — named import
const DB_PATH = join(homedir(), '.agentic-service', 'store.db')  // line 5
let _store = null                                // line 6 — singleton

async function getStore()                        // line 8 — lazy init
export async function get(key)                   // line 13 — JSON.parse, null for missing
export async function set(key, value)            // line 19 — JSON.stringify
export async function del(key)                   // line 24 — store.delete(key)
export { del as delete }                         // line 29 — alias
```

## Gap Analysis

The existing §5 is accurate and complete. Minor additions that would strengthen it:

1. **Consumer list** — Currently says "被 config.js（配置持久化）和 server 层使用". Actual verified consumers:
   - `src/runtime/memory.js` — imports `get`, `set`, `del` (verified line 1-3)
   - `src/config.js` — does NOT import store (verified — config uses its own file I/O)
   - ⚠️ The "config.js" consumer claim in §5 is incorrect. Config reads/writes `~/.agentic-service/config.json` directly via `fs`, not via store.

2. **Error contract** — Not documented: `JSON.parse` can throw on corrupted data (caller responsibility)

## Implementation Plan

### Files to modify
- `ARCHITECTURE.md` — §5 Store section (lines 363-374)

### Changes
1. Fix consumer list: replace "被 config.js（配置持久化）和 server 层使用" with "被 `runtime/memory.js`（语义记忆）使用"
2. Add error note: `JSON.parse` failure on corrupted data propagates to caller
3. No other changes needed — section is otherwise accurate

### Estimated diff: ~3 lines changed

## Test Cases
- Verify `src/config.js` does NOT import from `store/index.js` (grep confirms)
- Verify `src/runtime/memory.js` DOES import from `../store/index.js` (grep confirms)

## ⚠️ Unverified Assumptions
- None — all claims verified against source
