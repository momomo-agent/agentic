# Design: src/runtime/llm.js — chat stream

## File
`src/runtime/llm.js`

## Exports
```js
export async function* chat(messages, options = {}) → AsyncGenerator<{type, content|text, done?}>
```

## Logic
1. Load config via `loadConfig()` (lazy, cached): `detect()` → `getProfile(hardware)` → store as `_config`
2. On first load, call `watchProfiles(hardware, cb)` to hot-reload config
3. `chat()` tries `chatWithOllama(messages)` first (POST `http://localhost:11434/api/chat`, stream:true, 30s timeout)
4. On Ollama failure, yield `{type:'meta', provider:'cloud'}` then try fallback provider from `_config.fallback`
5. Supported fallbacks: `openai` (OPENAI_API_KEY), `anthropic` (ANTHROPIC_API_KEY)

## Chunk format
- `{type:'content', content:string, done:boolean}` — from Ollama
- `{type:'content', text:string, done:boolean}` — from cloud
- `{type:'meta', provider:'cloud'}` — signals fallback

## Error handling
- Ollama 4xx/5xx → warn + fallback
- No fallback key set → throw `Error('OPENAI_API_KEY not set')`
- AbortSignal.timeout(30000) on all fetch calls

## Dependencies
- `src/detector/hardware.js` → `detect()`
- `src/detector/profiles.js` → `getProfile()`, `watchProfiles()`
