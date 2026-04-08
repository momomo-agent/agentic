# M54: Core Runtime Layer — llm.js + stt.js + tts.js + sense.js + memory.js

## Goals
- Implement all 5 missing runtime modules per architecture spec

## Acceptance Criteria
- `src/runtime/llm.js`: chat(messages, options) → async stream, Ollama + cloud fallback
- `src/runtime/stt.js`: transcribe(audioBuffer) → text, Whisper local + cloud fallback
- `src/runtime/tts.js`: synthesize(text) → audioBuffer, local + cloud fallback
- `src/runtime/sense.js`: MediaPipe pipeline, headless camera path
- `src/runtime/memory.js`: store/recall APIs with vector embedding support

## Tasks
- task-1775525185400: src/runtime/llm.js (P0)
- task-1775525193095: src/runtime/stt.js (P0)
- task-1775525193128: src/runtime/tts.js (P0)
- task-1775525193162: src/runtime/sense.js (P0)
- task-1775525193194: src/runtime/memory.js (P0)
