# M56: Runtime Layer — llm.js + stt.js + tts.js + memory.js

## Goals
- Implement all missing runtime modules per architecture spec

## Acceptance Criteria
- src/runtime/llm.js: chat(messages, options) → stream (Ollama + cloud fallback)
- src/runtime/stt.js: transcribe(audioBuffer) → text
- src/runtime/tts.js: synthesize(text) → audioBuffer
- src/runtime/memory.js: store/retrieve/search with vector embeddings

## Tasks
- task-1775525610758: src/runtime/llm.js (P0)
- task-1775525614944: src/runtime/stt.js + tts.js (P0)
- task-1775525619511: src/runtime/memory.js (P0)
