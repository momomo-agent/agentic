# Codebase Map — agentic-service

Updated: 2026-04-11 (architect review — all modules documented, test suite green)

## Technology Stack

- **Runtime:** Node.js >=18, ES Modules
- **Framework:** Express 5 + ws (WebSocket)
- **Frontend:** Vue 3 + Vite (two apps: client + admin)
- **Testing:** Vitest (98% coverage thresholds)
- **Package Manager:** pnpm workspace (workspace:* deps)
- **External Packages:** agentic-embed, agentic-sense, agentic-store, agentic-voice

## File Tree

```
bin/
  agentic-service.js          (50 lines)  CLI entry — starts server, runs setup

src/
  index.js                    (10 lines)  Package entry — re-exports startServer/detect/getProfile/matchProfile
  config.js                   (341 lines) Unified config center — getConfig/setConfig/watchConfig/loadConfig/model pool

  cli/
    setup.js                  (253 lines) First-run wizard — hardware detect, profile match, Ollama install
    browser.js                (~20 lines) Opens browser after server starts
    download-state.js         (50 lines)  Download progress tracking

  detector/
    hardware.js               (119 lines) GPU/CPU/OS/memory detection — detect()
    profiles.js               (173 lines) Remote CDN profiles + local cache — getProfile(hardware)
    matcher.js                (112 lines) Profile scoring — matchProfile(profiles, hardware)
    ollama.js                 (40 lines)  Ollama auto-install + model pull — ensureOllama(model, onProgress)
    sox.js                    (28 lines)  SoX audio utility detection

  engine/
    registry.js               (116 lines) Engine registry — register/unregister/discoverModels/resolveModel/modelsForCapability
    init.js                   (45 lines)  Engine bootstrap — initEngines() registers ollama, whisper, tts, cloud engines
    ollama.js                 (95 lines)  Ollama engine — status/models/run for chat/vision/embedding
    cloud.js                  (59 lines)  Cloud engine factory — createCloudEngine(provider, config) for OpenAI/Anthropic/Google
    tts.js                    (41 lines)  TTS engine — kokoro/piper/macos-say model discovery
    whisper.js                (66 lines)  Whisper engine — whisper.cpp/SenseVoice STT model discovery

  runtime/
    stt.js                    (51 lines)  Speech-to-text — init(config), transcribe(audioBuffer)
    tts.js                    (71 lines)  Text-to-speech — init(config), synthesize(text)
    sense.js                  (120 lines) Visual perception — detect(frame), start()/stop(), startHeadless(), startWakeWordPipeline()
    embed.js                  (9 lines)   Vector embedding — embed(text) via agentic-embed
    profiler.js               (29 lines)  CPU profiling — startMark/endMark/getMetrics
    latency-log.js            (17 lines)  Latency recording — record(label, ms), getLog()
    vad.js                    (9 lines)   Voice activity detection — createVAD(options), detectVoiceActivity(buffer)
    adapters/
      embed.js                (3 lines)   Stub adapter (throws 'not implemented')
      sense.js                (7 lines)   agentic-sense adapter — createPipeline()
      voice/
        elevenlabs.js         (48 lines)  ElevenLabs TTS adapter
        macos-say.js          (61 lines)  macOS say command adapter
        openai-tts.js         (24 lines)  OpenAI TTS adapter
        openai-whisper.js     (9 lines)   OpenAI Whisper STT adapter
        piper.js              (119 lines) Piper TTS adapter (auto-downloads binary)
        sensevoice.js         (21 lines)  SenseVoice STT adapter (HTTP API)
        whisper.js            (29 lines)  Whisper.cpp STT adapter (local binary)

  server/
    api.js                    (813 lines) Express routes — REST + OpenAI-compatible + Anthropic-compatible + admin + voice + /api/perf
    brain.js                  (299 lines) LLM inference + tool calling + cloud fallback — chat(), registerTool(), chatSession()
    hub.js                    (313 lines) WebSocket device mgmt — init(), joinSession(), broadcastSession()
    middleware.js             (4 lines)   Error handler only (local-first; production needs enhancement)
    cert.js                   (7 lines)   Self-signed cert generation — generateCert()
    httpsServer.js            (7 lines)   HTTPS server factory — createHttpsServer(app)

  store/
    index.js                  (29 lines)  KV store wrapper — get/set/del/delete via agentic-store

  tunnel.js                   (21 lines)  LAN tunnel — startTunnel(port) via ngrok/cloudflared

  ui/
    admin/                    Admin dashboard (Vue 3 + Vite)
      src/App.vue             (101 lines) Router + sidebar layout
      src/main.js             Vue app bootstrap
      src/components/         ConfigPanel, DeviceList, HardwarePanel, LogViewer, SystemStatus
      src/views/              CloudModelsView, ConfigView, ExamplesView, LocalModelsView, LogsView, ModelsView, StatusView, TestView
      vite.config.js          Build config → dist/admin
    client/                   Chat UI (Vue 3 + Vite)
      src/App.vue             (73 lines)  Chat interface
      src/components/         ChatBox, InputBox, MessageList, PushToTalk, WakeWord
      src/composables/        useVAD.js, useWakeWord.js
      vite.config.js          Build config

profiles/
  default.json                (86 lines)  Built-in hardware profiles (apple-silicon, nvidia, cpu-only, none, default)

install/
  setup.sh                    One-click Unix install script
  Dockerfile                  Docker image build
  docker-compose.yml          Docker Compose (port 1234, OLLAMA_HOST, config + data volumes)
  docker-build.sh             Docker build helper

Dockerfile                    Root Docker image (EXPOSE 1234)
docker-compose.yml            Root Docker Compose (port 1234, OLLAMA_HOST, ./data volume)
```

## Module Dependencies

```
bin/agentic-service.js
  → src/cli/setup.js → src/detector/{hardware, profiles, ollama, matcher}
  → src/engine/init.js → src/engine/{registry, ollama, whisper, tts, cloud}
  → src/server/api.js → src/server/{brain, hub, middleware}
                       → src/runtime/{stt, tts, profiler, vad}
                       → src/config.js

src/engine/registry.js  — central model pool, resolveModel() routes to correct engine
src/engine/init.js      → src/engine/{registry, ollama, whisper, tts, cloud}, src/config.js
src/engine/ollama.js    → src/config.js
src/engine/cloud.js     — factory, no imports
src/engine/tts.js       — self-contained model list
src/engine/whisper.js   — checks local binaries + SenseVoice HTTP

src/server/brain.js → src/config.js, src/server/hub.js, src/runtime/profiler.js
src/server/hub.js   → src/server/brain.js, src/runtime/{stt, tts, vad}
src/runtime/stt.js  → src/runtime/adapters/voice/*
src/runtime/tts.js  → src/runtime/adapters/voice/*
src/runtime/sense.js → src/runtime/adapters/sense.js → agentic-sense
src/runtime/embed.js → agentic-embed
src/store/index.js  → agentic-store
```

## External Package Dependencies

| Package | Usage | Resolved |
|---------|-------|----------|
| agentic-embed | Vector embedding (bge-m3) | workspace:* |
| agentic-sense | MediaPipe perception | workspace:* |
| agentic-store | KV storage (SQLite/memory) | workspace:* |
| agentic-voice | STT/TTS unified interface | workspace:* |
| express | HTTP server | ^5.2.1 |
| ws | WebSocket | ^8.20.0 |
| cors | CORS middleware | ^2.8.6 |
| multer | File upload | ^2.1.1 |
| selfsigned | HTTPS cert generation | ^1.10.14 |
| node-record-lpcm16 | Microphone recording | ^1.0.1 |

## Test Status

- **169 test files, all passing** — 910 tests passed, 11 skipped (run 2026-04-11)
- Vitest coverage thresholds: 98% (statements/lines/branches/functions)
- profiles-edge-cases.test.js: all 14 tests pass (including expired-cache fallback)
- m21-profiles.test.js: all 2 tests pass (getProfile + built-in fallback)
- m76-embed-wiring, m77-sense-imports: fixed and passing
- m62-sigint-integration: all 4 tests pass
- m28-profiles-cache.test.js: fixed — cache timestamp now updated after successful fetch

## Known Issues (from gap analysis)

### Resolved
- ~~`src/index.js` missing~~ — src/index.js exists, exports startServer/detect/getProfile/chat/stt/tts/embed
- ~~Root `docker-compose.yml` port 3000~~ — now maps 1234:1234 with OLLAMA_HOST and ./data volume
- ~~`#agentic-voice` import map dead~~ — removed in commit e699e630
- ~~`#agentic-embed` import map dead~~ — removed in commit b4c9d5ce
- ~~m76/m77 test failures~~ — tests updated, all passing
- ~~Cloud fallback error-only~~ — brain.js now has 5s first-token timeout, 3-error threshold, 60s probe recovery
- ~~ARCHITECTURE.md stale CR content~~ — cleaned up, all sections contain legitimate module docs
- ~~ARCHITECTURE.md incomplete directory tree~~ — now lists all 80+ source files
- ~~Root `Dockerfile` EXPOSE 3000~~ — now EXPOSE 1234, matching service default port
- ~~ARCHITECTURE.md known limitation #4 (Dockerfile EXPOSE)~~ — removed, only 3 limitations remain
- ~~m21-profiles.test.js failing~~ — all 2 tests pass (getProfile returns correct structure + built-in fallback works)
- ~~m28-profiles-cache.test.js failing~~ — cache timestamp now updated after successful fetch

### Open
- `middleware.js` is a 4-line error handler — no validation/rate-limiting (acceptable for local-first service)
- `adapters/embed.js` is a dead-code stub — actual embed uses agentic-embed directly via runtime/embed.js
- mDNS/Bonjour `.local` hostname discovery not implemented — tunnel.js (ngrok/cloudflared) provides LAN access
- VISION.md directory tree references stale file names (optimizer.js, runtime/llm.js, runtime/memory.js) — CR cr-1775847503256 submitted

### Architecture Notes (Vision references that map to different files)
- Vision's `optimizer.js` → hardware optimization logic lives in profiles.js + matcher.js (CR cr-1775847503256 submitted to update VISION.md)
- Vision's `runtime/llm.js` → LLM logic lives in server/brain.js
- Vision's `runtime/memory.js` → store/index.js + embed.js provide the primitives
