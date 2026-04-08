# M70 DBB — Vision Completeness

## Done-By-Build Criteria

### 1. Voice Latency <=2s Benchmark
- [ ] `test/latency.test.js` exists and measures STT+LLM+TTS end-to-end
- [ ] Test asserts total latency <= 2000ms
- [ ] Test passes with local Ollama running

### 2. npx Entrypoint
- [ ] `package.json` has `"bin": { "agentic-service": "bin/agentic-service.js" }`
- [ ] `bin/agentic-service.js` has `#!/usr/bin/env node` shebang
- [ ] `node bin/agentic-service.js` starts server without errors
- [ ] `npx agentic-service --help` or `npx agentic-service` works

### 3. External Package Wrappers
- [ ] `src/runtime/sense.js` imports from `agentic-sense` (not inline stub)
- [ ] `src/runtime/stt.js` imports from `agentic-voice`
- [ ] `src/runtime/tts.js` imports from `agentic-voice`
- [ ] `package.json` lists `agentic-sense` and `agentic-voice` as dependencies

### 4. README Completeness
- [ ] README has Install section (npx, global, Docker)
- [ ] README has Usage/Quick Start section
- [ ] README has Config section (profiles, env vars)
- [ ] README has API Endpoints section (POST /api/chat, POST /api/transcribe, etc.)
