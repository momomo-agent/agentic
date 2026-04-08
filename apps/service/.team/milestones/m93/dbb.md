# M93 DBB — PRD Partial Gap Closure

## Verification Criteria

### 1. agentic-voice STT/TTS resolves (task-1775583805854)
- [ ] STT/TTS tests pass without import resolution errors
- [ ] Mocks for `agentic-voice/openai-whisper` and `agentic-voice/openai-tts` are in place

### 2. Wake word pipeline not a stub (task-1775583813340)
- [ ] `startWakeWordPipeline()` attempts real mic capture via `node-record-lpcm16`
- [ ] Graceful degradation: logs warning and returns if dependency unavailable
- [ ] Test confirms callable and handles missing dep without throwing

### 3. Cloud fallback + npx entrypoint (task-1775583813385)
- [ ] Cloud fallback test passes with mocked fetch returning valid stream
- [ ] `node bin/agentic-service.js --help` exits 0
- [ ] `llm.js chat()` yields chunks from cloud when Ollama fails
