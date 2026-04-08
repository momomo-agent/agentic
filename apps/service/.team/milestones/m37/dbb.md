# M37 DBB — Done-By-Definition

## Verification Criteria

### task-1775519613741: src/runtime/llm.js
- [ ] `chat(messages, options)` exports as async generator
- [ ] Streams tokens from Ollama `/api/chat` endpoint
- [ ] Falls back to cloud provider on timeout/failure
- [ ] Handles empty messages array gracefully

### task-1775519617446: src/runtime/stt.js
- [ ] `transcribe(audioBuffer)` accepts Node.js Buffer
- [ ] Returns string transcription
- [ ] Throws descriptive error if STT service unavailable

### task-1775519617481: src/runtime/tts.js
- [ ] `synthesize(text)` accepts string
- [ ] Returns Node.js Buffer (audio data)
- [ ] Throws descriptive error if TTS service unavailable

### task-1775519621685: src/server/hub.js
- [ ] `register(deviceId, socket)` tracks device
- [ ] `unregister(deviceId)` removes device
- [ ] Emits `join` event on register, `leave` on unregister
- [ ] `getDevices()` returns current device map

### task-1775519621719: src/server/brain.js
- [ ] `handleChat(messages, options)` routes to llm.js
- [ ] Supports tool calling (passes tools array to llm)
- [ ] Returns async generator stream
- [ ] Depends on llm.js runtime (task-1775519613741 must be done first)
