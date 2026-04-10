# Module Design: Runtime（服务运行时）

**ARCHITECTURE.md Section:** 2. Runtime（服务运行时）
**Status:** ready-for-review

## LLM — lives in src/server/brain.js (NOT src/runtime/)

⚠️ There is no `src/runtime/llm.js`. All LLM chat + fallback logic is in `src/server/brain.js`.
See `.team/designs/server.design.md` for brain.js details.

### Verified Exports (src/server/brain.js)
```javascript
export function registerTool(name, fn)                          // line 49
export async function* chat(input, options = {})                // line 264
export async function chatSession(sessionId, userMessage, options = {})  // line 279
```

### Cloud Fallback — IMPLEMENTED (brain.js lines 8-47, 99-171)
- **Timeout trigger:** `FIRST_TOKEN_TIMEOUT_MS = 5000` — AbortController aborts if no first token
- **Consecutive errors:** `MAX_ERRORS = 3` — `_errorCount++` on failure, cloud mode at threshold
- **Auto-restore:** `PROBE_INTERVAL_MS = 60000` — probes `${ollamaHost}/api/tags`, restores on success
- **Config reset:** `onConfigChange` resets `_cloudMode`, `_errorCount`, stops probing
- **Fallback slot:** `resolveModel('chatFallback')` from model pool

### Internal Dependencies
- `../config.js` → `getConfig`, `getModelPool`, `getAssignments`, `onConfigChange`
- `./hub.js` → `getSession`, `broadcastSession`
- `../runtime/profiler.js` → `startMark`, `endMark`

## Memory (src/runtime/memory.js)

### Verified Exports
```javascript
export async function add(text)                    // line 12
export async function remove(key)                  // line 26
export { remove as delete }                        // line 33
export async function search(query, topK = 5)      // line 35
```

### Internal Data Flow
- `embed(text)` → vector via `./embed.js`
- `get/set/del` → KV via `../store/index.js`
- Index stored at key `mem:__index__` as array of IDs
- Write serialization via `_lock` promise chain

## Embed (src/runtime/embed.js)

```javascript
export async function embed(text)  // delegates to agentic-embed localEmbed()
```

### Verified Contract
- `localEmbed` from agentic-embed expects `string[]`, returns `number[][]`
- `embed()` wraps single text in array, returns first vector: `embed(text) → number[]`
- Empty string → `[]`, non-string → `TypeError`

## STT / TTS / VAD / Sense

All verified present. No changes needed for M98.

## Constraints
- `_lock` in memory.js ensures serial writes — must not be bypassed
- `embed()` throws TypeError on non-string — callers must validate
