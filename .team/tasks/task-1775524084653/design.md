# Ollama Non-200 Fallback Bug Fix

## Files to modify
- `src/runtime/llm.js` — fix fallback trigger on non-200 Ollama response

## Algorithm
1. In `chat()`, wrap Ollama fetch in try/catch
2. Check `response.ok` — if false, throw to trigger fallback
3. Fallback: call cloud provider (OpenAI) with same messages

## Function signatures
```js
// src/runtime/llm.js
export async function* chat(messages, options = {}) {
  try {
    const res = await fetch('http://localhost:11434/api/chat', { ... })
    if (!res.ok) throw new Error(`Ollama ${res.status}`)
    yield* streamOllama(res)
  } catch {
    yield* streamCloud(messages, options)  // OpenAI fallback
  }
}
```

## Edge cases
- Ollama returns 200 but stream errors mid-way: catch stream error, emit partial then fallback or surface error
- No `OPENAI_API_KEY` set: throw descriptive error instead of silent fail

## Test cases
- Ollama returns 503 → fallback to cloud called
- Ollama returns 200 → cloud not called
