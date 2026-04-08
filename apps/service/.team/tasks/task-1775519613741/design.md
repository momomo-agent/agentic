# Design: src/runtime/llm.js

## Interface
```js
export async function* chat(messages, options = {})
// yields: { type: 'content', content: string, done: boolean }
// yields: { type: 'meta', provider: 'cloud' }
```

## Logic
1. `loadConfig()` — hardware detect → profile → cache; watch for profile changes
2. `chatWithOllama(messages)` — POST `http://localhost:11434/api/chat` stream:true, 30s timeout, parse NDJSON
3. On Ollama failure → warn, fall through to cloud
4. Cloud: read `config.fallback.{provider,model}`, yield meta, delegate to OpenAI or Anthropic helper

## Error Handling
- Ollama non-200: throw `Error('Ollama API error: <status>')`
- Missing API key: throw `Error('<PROVIDER>_API_KEY not set')`
- Unknown fallback provider: throw

## Dependencies
- `../detector/hardware.js` → `detect()`
- `../detector/profiles.js` → `getProfile()`, `watchProfiles()`

## Test Cases
- Ollama up: yields content chunks
- Ollama down: meta chunk + cloud content
- Empty messages array: no crash
