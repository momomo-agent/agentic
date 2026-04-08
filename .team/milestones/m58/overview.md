# M58: Runtime Layer — llm.js + stt.js + tts.js + sense.js + memory.js

## Goals
- Implement all missing runtime modules per architecture spec

## Acceptance Criteria
- src/runtime/llm.js: chat(messages, options) → async stream, integrates Ollama
- src/runtime/stt.js: transcribe(audioBuffer) → text, integrates Whisper
- src/runtime/tts.js: synthesize(text) → audioBuffer
- src/runtime/sense.js: MediaPipe headless camera path, returns perception data
- src/runtime/memory.js: store/retrieve conversation context across turns

## Tasks
- task-1775525719297: src/runtime/llm.js (P0)
- task-1775525724277: src/runtime/stt.js (P0)
- task-1775525731570: src/runtime/tts.js (P0)
- task-1775525731612: src/runtime/sense.js (P0)
- task-1775525735258: src/runtime/memory.js (P0)
