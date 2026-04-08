# Design: src/runtime/llm.js

## Files
- `src/runtime/llm.js` — create

## Interface

```js
async function* chat(messages, options = {})
// messages: [{ role: 'user'|'assistant'|'system', content: string }]
// options: { model?, temperature?, maxTokens? }
// yields: string chunks
```

## Logic

1. Check if Ollama is reachable (`GET http://localhost:11434/api/tags`, timeout 2s)
2. If reachable: POST `http://localhost:11434/api/chat` with `{ model, messages, stream: true }`
   - Parse NDJSON stream, yield `chunk.message.content`
3. If not reachable (or error): fallback to OpenAI
   - `POST https://api.openai.com/v1/chat/completions` with `stream: true`
   - Parse SSE, yield content deltas
4. Model selection: `options.model` → env `OLLAMA_MODEL` → `'gemma2:2b'`
5. OpenAI fallback model: env `OPENAI_MODEL` → `'gpt-4o-mini'`

## Edge Cases
- Both providers fail: throw last error
- `OPENAI_API_KEY` missing when falling back: throw descriptive error
- Partial chunk boundary in stream: buffer incomplete JSON lines

## Dependencies
- Node `fetch` (built-in ≥18)
- env: `OLLAMA_HOST`, `OLLAMA_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`

## Tests
- yields chunks from Ollama stream
- falls back to OpenAI when Ollama unreachable
- throws when both fail
- respects model override in options
