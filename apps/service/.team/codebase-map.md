# Codebase Map — agentic-service

Updated: 2026-04-11

## Technology Stack

- **Runtime:** Node.js >=18, ES Modules
- **Framework:** Express 5 + ws (WebSocket)
- **Frontend:** Vue 3 + Vite (two apps: client + admin)
- **Testing:** Vitest
- **Package Manager:** pnpm workspace (workspace:* deps)
- **External Packages:** agentic-embed, agentic-sense, agentic-store, agentic-voice

## File Tree

```
bin/
  agentic-service.js          (50 lines)  CLI entry — starts server, runs setup

src/
  config.js                   (330 lines) Unified config center — getConfig/setConfig/onConfigChange/model pool

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
    stt.js                    (39 lines)  Speech-to-text — init(config), transcribe(audioBuffer)
    tts.js                    (71 lines)  Text-to-speech — init(config), synthesize(text)
    sense.js                  (120 lines) Visual perception — detect(frame), start()/stop(), startHeadless()
    embed.js                  (7 lines)   Vector embedding — embed(text) via agentic-embed
    profiler.js               (30 lines)  CPU profiling — startMark/endMark/getMetrics
    latency-log.js            (18 lines)  Latency recording — record(label, ms), getLog()
    vad.js                    (10 lines)  Voice activity detection — detectVoiceActivity(buffer)
    adapters/
      embed.js                (~10 lines) Stub adapter (throws 'not implemented')
      sense.js                (~40 lines) agentic-sense adapter — createPipeline()
      voice/
        elevenlabs.js         (48 lines)  ElevenLabs TTS adapter
        macos-say.js          (61 lines)  macOS say command adapter
        openai-tts.js         (24 lines)  OpenAI TTS adapter
        openai-whisper.js     (~30 lines) OpenAI Whisper STT adapter
        piper.js              (119 lines) Piper TTS adapter (auto-downloads binary)
        sensevoice.js         (21 lines)  SenseVoice STT adapter (HTTP API)
        whisper.js            (29 lines)  Whisper.cpp STT adapter (local binary)

  server/
    api.js                    (661 lines) Express routes — REST + OpenAI-compatible + admin + voice
    brain.js                  (217 lines) LLM inference + tool calling + cloud fallback — chat(), registerTool(), chatSession()
    hub.js                    (312 lines) WebSocket device mgmt — init(), joinSession(), broadcastSession()
    middleware.js             (5 lines)   Error handler only
    cert.js                   (~30 lines) Self-signed cert generation — generateCert()
    httpsServer.js            (~20 lines) HTTPS server factory — createHttpsServer(app)

  store/
    index.js                  (29 lines)  KV store wrapper — get/set/del/delete via agentic-store

  tunnel.js                   (21 lines)  LAN tunnel — startTunnel(port) via ngrok/cloudflared

  ui/
    admin/                    Admin dashboard (Vue 3 + Vite)
      src/App.vue             (101 lines) Router + sidebar layout
      src/main.js             Vue app bootstrap
      src/components/         ConfigPanel, DeviceList, HardwarePanel, LogViewer, SystemStatus
      src/views/              CloudModelsView, ConfigView, ExamplesView, LocalModelsView, LogsView, StatusView, TestView
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

Dockerfile                    Root Docker image (port 3000)
docker-compose.yml            Root Docker Compose (port 3000, no OLLAMA_HOST, no data volume)
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

## Known Issues (from gap analysis)

- ~~`src/index.js` missing~~ — RESOLVED: src/index.js exists, exports startServer/detect/getProfile/chat/stt/tts/embed
- ~~Root `docker-compose.yml` exposes port 3000~~ — RESOLVED: now maps 1234:1234 with OLLAMA_HOST and ./data volume
- ~~Root `docker-compose.yml` missing OLLAMA_HOST env var and ./data volume~~ — RESOLVED
- ~~Cloud fallback triggers on error only~~ — RESOLVED: brain.js now has 5s first-token timeout, 3-error threshold, 60s probe recovery
- ~~`#agentic-voice` import map dead~~ — RESOLVED: removed in commit e699e630
- `#agentic-embed` import map in package.json is dead — CR submitted (cr-1775840326577), task-1775840057892 in review
- `middleware.js` is a 4-line error handler — no validation/rate-limiting (acceptable for local-first service)
- `adapters/embed.js` is a stub that throws 'not implemented' — dead code, actual embed uses agentic-embed directly via runtime/embed.js
- `src/detector/optimizer.js` — referenced in Vision but does not exist on disk; hardware optimization logic is in profiles.js + matcher.js
- `src/runtime/llm.js` — referenced in Vision but does not exist; LLM logic lives in server/brain.js
- `src/runtime/memory.js` — referenced in Vision but does not exist; store/index.js + embed.js provide the primitives
