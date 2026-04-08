# M90 DBB — Wake Word, Cloud Fallback, LAN Tunnel, npx Startup

## Verification Criteria

### 1. Wake Word Server-Side Pipeline
- [ ] `src/runtime/sense.js` exports `startWakeWordPipeline()` that captures mic audio and emits `wake_word` events
- [ ] Pipeline uses `node-record-lpcm16` or equivalent to capture audio on server side
- [ ] Wake word detection triggers callback/event (not a stub)
- [ ] `stop()` cleanly terminates mic capture

### 2. Cloud Fallback (LLM)
- [ ] `src/runtime/llm.js` `chat()` falls back to cloud when Ollama is unavailable (connection refused)
- [ ] Fallback uses `config.fallback.provider` + `config.fallback.model` from profile
- [ ] OpenAI fallback works when `OPENAI_API_KEY` is set
- [ ] Anthropic fallback works when `ANTHROPIC_API_KEY` is set
- [ ] Missing API key throws descriptive error (not silent failure)
- [ ] `{ type: 'meta', provider: 'cloud' }` chunk emitted before cloud stream

### 3. LAN Tunnel + HTTPS Cert
- [ ] `src/tunnel.js` `startTunnel(port)` spawns ngrok or cloudflared and returns child process
- [ ] `src/server/cert.js` `generateCert()` returns `{ key, cert }` PEM strings
- [ ] HTTPS server starts without error when `--https` flag passed
- [ ] SIGINT kills tunnel subprocess cleanly

### 4. npx One-Command Startup
- [ ] `npx agentic-service` starts server without errors
- [ ] `bin/agentic-service.js` shebang and package.json `bin` field are correct
- [ ] Server listens on configured port and responds to `GET /api/status`
