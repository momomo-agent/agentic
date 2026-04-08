# M41 DBB — Done-By-Build Criteria

## Runtime Layer

- [ ] `src/runtime/sense.js` exports `initHeadless(options)`, `detectFrame(buffer)`, `startHeadless()` — headless path works without videoElement
- [ ] `src/runtime/memory.js` exports `add(text)`, `search(query, topK)`, `remove(key)` — backed by agentic-store + agentic-embed

## Server Layer

- [ ] `src/server/hub.js` exports `registerDevice`, `unregisterDevice`, `getDevices`, `sendCommand`, `initWebSocket`, `heartbeat`
- [ ] `src/server/brain.js` exports `chat(messages, options) → AsyncGenerator`, `registerTool(name, fn)`
- [ ] `src/server/api.js` exports `createApp()`, `startServer(port, opts)` — all endpoints respond correctly

## Profiles

- [ ] `profiles/default.json` exists with at least 3 match entries (apple-silicon, nvidia, fallback)
- [ ] Service starts without CDN access using default profile

## Integration

- [ ] `POST /api/chat` streams SSE chunks
- [ ] `POST /api/transcribe` accepts multipart audio, returns `{ text }`
- [ ] `POST /api/synthesize` accepts `{ text }`, returns audio/wav
- [ ] `GET /api/status` returns `{ hardware, profile, ollama, devices }`
- [ ] `GET /api/devices` returns device array
