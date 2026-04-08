# M37: Runtime层全实现 (llm/stt/tts/sense/memory)

## Goals
Implement all 5 missing P0 runtime modules to satisfy ARCHITECTURE.md interfaces.

## Scope
- `src/runtime/llm.js` — chat(messages, options) → stream
- `src/runtime/stt.js` — transcribe(audioBuffer) → text
- `src/runtime/tts.js` — synthesize(text) → audioBuffer
- `src/runtime/sense.js` — MediaPipe headless sense runtime
- `src/runtime/memory.js` — store/retrieve/forget with vector embeddings

## Acceptance Criteria
- llm.js streams tokens via async generator, Ollama-first with cloud fallback
- stt.js accepts Buffer, returns string
- tts.js accepts string, returns Buffer
- sense.js supports headless Node.js frame input
- memory.js supports vector embeddings + KV store

## Dependencies
- Activates after m36 completes
