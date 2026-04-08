# M52: Core Runtime Layer — llm.js + stt.js + tts.js + sense.js + memory.js

## Goals
Implement all 5 runtime modules per ARCHITECTURE.md spec.

## Scope
- `src/runtime/llm.js` — chat(messages, options) → stream, Ollama-first + cloud fallback
- `src/runtime/stt.js` — transcribe(audioBuffer) → text
- `src/runtime/tts.js` — synthesize(text) → audioBuffer
- `src/runtime/sense.js` — MediaPipe headless sense runtime
- `src/runtime/memory.js` — memory runtime (agentic-store backed)

## Acceptance Criteria
- All 5 files exist under src/runtime/
- llm.js auto-selects Ollama, falls back to cloud on timeout/failure
- stt.js and tts.js wrap agentic-voice
- Unit tests pass for each module
