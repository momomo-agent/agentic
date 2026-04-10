# Module Design: Runtime（服务运行时）

**ARCHITECTURE.md Section:** 2. Runtime（服务运行时）
**Status:** ready-for-review

## LLM (src/runtime/llm.js)

### Verified Exports
```javascript
export async function* chat(messageOrText, options = {})  // line 112
```

### Current Fallback Logic (lines 121-148)
1. Try `chatWithOllama(messages)` — 30s AbortSignal timeout
2. On ANY error → fall back to cloud
3. Cloud provider selected from `config.fallback.provider` (openai | anthropic)

### PRD-Required Fallback (task-1775793599517)
Must add:
- **Timeout trigger:** If Ollama first-token >5s, abort and switch to cloud
- **Consecutive error counter:** Track errors; 3 consecutive → enter cloud mode
- **Auto-restore:** When in cloud mode, probe Ollama every 60s; on success, restore local
- **State:** Module-level `let _cloudMode = false; let _errorCount = 0; let _probeTimer = null`

### Internal Dependencies
- `../config.js` → `getConfig`, `onConfigChange`
- `./latency-log.js` → `record`
- `./profiler.js` → `startMark`, `endMark`

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
