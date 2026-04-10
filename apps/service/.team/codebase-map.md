# Codebase Map — agentic-service

Updated: 2026-04-11 (architect review — adapters/embed.js deleted from disk; kokoro.js confirmed functional (35 lines); voice adapter API signatures in ARCHITECTURE.md; all gap monitors ≥90%)

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
  config.js                   (352 lines) Unified config center — getConfig/setConfig/watchConfig/loadConfig/model pool

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
    memory.js               (58 lines)  Semantic memory — add(text, metadata), search(query, topK), remove(id), clear(); uses store + embed
    profiler.js               (29 lines)  CPU profiling — startMark/endMark(→ms)/getMetrics(→{last,avg,count})/measurePipeline
    latency-log.js            (17 lines)  Latency recording — record(stage, ms), p95(stage), reset()
    vad.js                    (9 lines)   Voice activity detection — createVAD(options), detectVoiceActivity(buffer)
    adapters/
      sense.js                (7 lines)   agentic-sense adapter — createPipeline()
      voice/
        elevenlabs.js         (48 lines)  ElevenLabs TTS adapter — synthesize(text) → Buffer
        kokoro.js             (35 lines)  Kokoro TTS adapter — synthesize(text) → Buffer (HTTP → localhost:8880)
        macos-say.js          (61 lines)  macOS say command adapter — synthesize(text) → Buffer, listVoices()
        openai-tts.js         (24 lines)  OpenAI TTS adapter — synthesize(text) → Buffer
        openai-whisper.js     (9 lines)   OpenAI Whisper STT adapter — transcribe(buffer) → string
        piper.js              (119 lines) Piper TTS adapter (auto-downloads binary) — synthesize(text) → Buffer
        sensevoice.js         (21 lines)  SenseVoice STT adapter (HTTP API) — check(), transcribe(buffer) → string
        whisper.js            (29 lines)  Whisper.cpp STT adapter (local binary) — check(), transcribe(buffer) → string

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
      src/main.js             (5 lines)   Vue app mount
      src/components/
        ConfigPanel.vue       (30 lines)  LLM/STT/TTS config editor
        DeviceList.vue        (23 lines)  Connected device table
        HardwarePanel.vue     (11 lines)  Hardware info display
        LogViewer.vue         (14 lines)  Scrollable log viewer
        SystemStatus.vue      (22 lines)  System status summary
      src/views/
        StatusView.vue        (318 lines) Dashboard overview
        ConfigView.vue        (223 lines) Config management
        ModelsView.vue        (307 lines) Model management
        LocalModelsView.vue   (308 lines) Local model browser
        CloudModelsView.vue   (276 lines) Cloud model browser
        LogsView.vue          (136 lines) Log viewer
        TestView.vue          (288 lines) API test console
        ExamplesView.vue      (2485 lines) Usage examples
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

## External Package APIs (verified from node_modules source)

| Package | Exports | Usage in Service |
|---------|---------|-----------------|
| agentic-embed | `create(opts)`, `chunkText(text, opts)`, `cosineSimilarity(a, b)`, `localEmbed(text)` | runtime/embed.js → `localEmbed(text)` |
| agentic-sense | `AgenticSense(videoEl)`, `AgenticAudio`, `IDX`, `extractFrame(video)` | adapters/sense.js → `new AgenticSense()` |
| agentic-store | `createStore(name)` → `{get, set, delete, keys, clear, exec, run, all}` | store/index.js → `open(DB_PATH)` (named import; package exports `createStore`) |
| agentic-voice | `createSTT(opts)`, `createTTS(opts)`, `createVoice(opts)` | stt.js/tts.js → adapters use these |

## Test Status

- **174 test files, 174 passing, 0 failing** — 981 tests passed, 11 skipped (run 2026-04-11)
- Vitest coverage thresholds: 98% (statements/lines/branches/functions)
- All previously flaky tests (hardware timing, profiles hot-reload, config persistence) now passing consistently

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
- ~~m21-profiles.test.js failing~~ — all 2 tests pass
- ~~m28-profiles-cache.test.js failing~~ — cache timestamp now updated after successful fetch
- ~~ARCHITECTURE.md underdocumented modules~~ — store, embed, adapters, profiler, latency-log, CLI tools now have formal module descriptions
- ~~`runtime/memory.js` pending~~ — implemented (58 lines): add/search/remove/clear using store + embed
- ~~Config persistence tests failing~~ — api-layer and api-m2 tests all passing
- ~~1 flaky test: hardware detector timing~~ — now passing consistently (515ms)
- ~~m13-dbb profiles hot-reload flaky~~ — now passing consistently

### Open
- `middleware.js` is a 4-line error handler — no validation/rate-limiting (acceptable for local-first service)
- ~~`adapters/embed.js` is a dead-code stub~~ — deleted from disk
- mDNS/Bonjour `.local` hostname discovery not implemented — tunnel.js (ngrok/cloudflared) provides LAN access
- `detector/optimizer.js` does not exist — functionality covered by profiles.js + matcher.js + config.js
- VISION.md directory tree references stale file names (optimizer.js, runtime/llm.js) — CR submitted (cr-1775850000000, resolved → task-1775847821786)
- `store/index.js` imports `open` from agentic-store but package exports `createStore` — may rely on test mocks or alias

### Architecture Notes (Vision references that map to different files)
- Full mapping table now in ARCHITECTURE.md "Vision 架构映射" section
- Vision's `optimizer.js` → profiles.js + matcher.js + config.js
- Vision's `runtime/llm.js` → server/brain.js + engine/
- Vision's `runtime/memory.js` → runtime/memory.js (58 lines) — fully implemented: add/search/remove/clear using store/index.js + embed.js
- ARCHITECTURE.md now documents: src/index.js entry point, hardware-adaptive model selection, CPU profiling/latency, /api/perf endpoint, Vision mapping table, formal module sections for all runtime/store/adapter modules
