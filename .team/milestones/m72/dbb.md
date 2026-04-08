# M72 DBB — Voice Latency + npx + README + External Packages

## task-1775528530048: Voice latency <2s benchmark
- [ ] STT+LLM+TTS round-trip measured and documented
- [ ] Latency target <2s on apple-silicon hardware
- [ ] Benchmark result recorded in README or test output

## task-1775528544032: npx entrypoint verification
- [ ] `bin/agentic-service.js` has `#!/usr/bin/env node` shebang
- [ ] `package.json` `bin` field points to `bin/agentic-service.js`
- [ ] `npx agentic-service` starts server without errors

## task-1775528544066: README completeness
- [ ] README covers npx install method
- [ ] README covers Docker install method
- [ ] README covers global npm install method
- [ ] README lists all API endpoints (POST /api/chat, POST /api/transcribe, POST /api/synthesize, GET /api/status, GET/PUT /api/config)
- [ ] README documents config options

## task-1775528544100: agentic-sense and agentic-voice package wiring
- [ ] `src/runtime/sense.js` imports from `agentic-sense`
- [ ] `src/runtime/stt.js` imports from `agentic-voice`
- [ ] `src/runtime/tts.js` imports from `agentic-voice`
- [ ] Both packages listed in `package.json` dependencies
