# Design: DBB 规范修复

## Files to Modify

### `src/server/brain.js`
**Issue**: yield `{ type: 'content', content: ... }` — consumers expect `text` field.

**Fix** (2 sites):
```js
// Ollama path (~line 43)
yield { type: 'content', text: data.message.content, done: data.done || false };

// OpenAI path (~line 90)
if (delta?.content) yield { type: 'content', text: delta.content, done: false };
```

### `src/detector/profiles.js`
**Issue**: CDN URL org name may be wrong (`momomo-ai` vs actual repo).

**Fix**: Verify URL resolves. If 404, update:
```js
const PROFILES_URL = 'https://cdn.jsdelivr.net/gh/momo-ai/agentic-service@main/profiles/default.json';
```
Confirm `loadLocalProfiles()` fallback is called on fetch failure.

### `src/store/index.js` / `src/runtime/memory.js`
**Assessment**: `store/index.js` exports `del()` which calls `store.delete()` internally — correct. `memory.js` imports `del` correctly. No rename needed.

**Action**: Grep for any `store.del(` direct calls outside memory.js and fix to use imported `del`.

## Edge Cases
- After `content→text` rename, verify all consumers of brain.js use `chunk.text`
- CDN timeout already handled by catch→local fallback — confirm local file exists at `profiles/default.json`

## Test Cases
- Stream chat → assert chunks have `text` field, not `content`
- Mock CDN 404 → assert local profile returned without error
- `set('k','v')` → `del('k')` → `get('k')` === null
