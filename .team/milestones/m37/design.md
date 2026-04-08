# M37 Technical Design — Runtime层 + Server层核心实现

## Overview

Implement 5 core modules per ARCHITECTURE.md interfaces:
- `src/runtime/llm.js` — Ollama streaming chat with cloud fallback
- `src/runtime/stt.js` — audio buffer → text transcription
- `src/runtime/tts.js` — text → audio buffer synthesis
- `src/server/hub.js` — device registry with EventEmitter
- `src/server/brain.js` — LLM inference router with tool calling

## Execution Order

1. `llm.js` (no deps)
2. `stt.js`, `tts.js` (no deps, parallel)
3. `hub.js` (no deps, parallel with above)
4. `brain.js` (depends on llm.js)

## Module Interfaces

### llm.js
```js
async function* chat(messages, options) // options: { model, tools, timeout }
```
- POST to `http://localhost:11434/api/chat` with `stream: true`
- Parse NDJSON chunks, yield `delta.content`
- On timeout/error, retry via cloud fallback (openai-compatible)

### stt.js
```js
async function transcribe(audioBuffer) // Buffer → string
```
- Write buffer to temp file, call local STT HTTP endpoint
- Return transcript string

### tts.js
```js
async function synthesize(text) // string → Buffer
```
- POST text to local TTS HTTP endpoint
- Return audio Buffer

### hub.js
```js
class Hub extends EventEmitter
  register(deviceId, socket)   // emits 'join'
  unregister(deviceId)         // emits 'leave'
  getDevices()                 // → Map<deviceId, socket>
```

### brain.js
```js
async function* handleChat(messages, options) // options: { tools }
```
- Delegates to `llm.chat(messages, options)`
- If tool_call in stream chunk, executes tool and continues
