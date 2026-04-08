# Design: src/runtime/llm.js

## File
`src/runtime/llm.js`

## Interface
```js
async function* chat(messages, options = {})
// messages: Array<{ role: 'user'|'assistant'|'system', content: string }>
// options: { model?: string, temperature?: number, timeout?: number }
// yields: string (chunks)
```

## Logic
1. Load current profile via `src/detector/profiles.js` → get `profile.llm` and `profile.fallback`
2. Try local Ollama: `POST http://localhost:11434/api/chat` with `{ model, messages, stream: true }`
3. Parse NDJSON stream, yield each `message.content` chunk
4. On connection error or timeout (default 30s) → fallback to `profile.fallback` (OpenAI-compatible)
5. Fallback: call OpenAI API with same messages, stream response

## Error Handling
- Both local and fallback fail → throw Error('LLM unavailable')
- Timeout: use `AbortController` with `setTimeout`

## Dependencies
- `src/detector/profiles.js` — getProfile()
- `node-fetch` or native `fetch` (Node 18+)

## Test Cases
- chat([{role:'user', content:'hi'}]) yields at least one string chunk
- Ollama down → fallback triggers, still yields chunks
- Both down → throws Error
