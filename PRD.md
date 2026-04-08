# agentic-service — PRD

## M1: 硬件检测 + 一键启动

**目标：** 检测硬件 → 自动选模型 → 一键启动本地 AI 服务

### Features

1. **硬件检测器** — 检测 GPU 类型、显存/内存、CPU 架构、OS
2. **远程 profiles** — 从 CDN 拉取硬件配置推荐表，本地缓存
3. **Ollama 集成** — 自动安装 Ollama + 拉取推荐模型
4. **基础 HTTP 服务** — REST API 接受文本输入，返回 LLM 回复
5. **Web UI（最小版）** — 一个对话框，能打字聊天
6. **一键安装脚本** — `curl -fsSL ... | sh` 或 `npx agentic-service`

### 验收标准

- [ ] 在 M4 Mac mini 上 `npx agentic-service` 能自动检测硬件并推荐 gemma4
- [ ] 首次安装（含模型下载）< 10 分钟
- [ ] 非首次启动 < 10 秒
- [ ] 文本对话可用

---

## M2: 语音交互

**目标：** 加上语音输入输出，实现语音对话

### Features

1. **STT 集成** — SenseVoice（Apple Silicon）/ Whisper（CUDA）/ 云端 fallback
2. **TTS 集成** — 本地 TTS（Kokoro/Piper）/ 云端 fallback
3. **Web UI 语音** — 按住说话 / VAD 自动检测
4. **唤醒词** — 可配置唤醒词（默认 "hey"）

---

## M3: 多设备 + 感知

**目标：** 多设备连接同一个 AI 大脑，加上视觉感知

### Features

1. **多设备连接** — WebSocket 设备注册/心跳
2. **视觉感知** — agentic-sense（人脸/手势/物体）浏览器端运行
3. **设备工具** — speak(device) / display(device) / capture(device)
4. **管理面板** — 设备列表、日志、配置

---

## M4: 云端 fallback + 产品打磨

**目标：** 本地不够时自动切云端，整体打磨

### Features

1. **云端 fallback** — 本地推理慢/失败时自动切 OpenAI/Anthropic API
2. **配置热更新** — 远程 profiles 更新后自动推荐新模型
3. **Docker 部署** — docker-compose 一键起
4. **文档 + README** — 完整的用户文档


Add to PRD.md the following sections: (1) M3: WebSocket message envelope schema {type, deviceId, payload, ts}; heartbeat interval 30s; registration handshake sequence. (2) M3: Admin panel MUST source device list from GET /api/status and config from GET /api/config — no static files. (3) M4: Cloud fallback triggers: local LLM timeout >5s OR 3 consecutive errors → auto-switch to configured cloud provider; restore local after 60s probe succeeds. (4) M4: STT/TTS provider selection: profile.stt.provider field drives runtime/stt.js provider choice — sensevoice for apple-silicon, whisper for nvidia, cloud for cpu-only. (5) M4: Docker — docker-compose.yml must expose port 3000, mount ./data volume, include OLLAMA_HOST env var. (6) M5: sense.js must call agentic-sense detect(stream) → {faces, gestures, objects}; memory.js must expose search(query, topK) and upsert(id, text, meta) via agentic-store+agentic-embed.

1. sense.js API contract: PRD must specify whether sense.js uses synchronous detect(frame) call or event-based pipeline — DBB expects detect(frame) but implementation uses event loop. 2. store.js API: PRD must clarify whether the KV store exposes delete() or del() — DBB-002 requires store.delete(key) but implementation exports del(). 3. hub.js heartbeat timeout: PRD must specify exact timeout — DBB-005 says 60s but implementation uses 40s. 4. CDN URL for profiles.json: PRD must provide a real accessible URL instead of cdn.example.com placeholder. 5. wake word detection: PRD must clarify whether audio-level wake word detection is required (M8) or text-match only is acceptable. 6. HTTPS/intranet tunneling: PRD must specify if multi-device cross-network access requires HTTPS or tunneling support in hub.js. 7. End-to-end voice latency: PRD must define measurable acceptance criteria (<2s) and require benchmark tests. 8. STT/TTS cloud fallback: PRD must explicitly require adaptive provider selection in stt.js/tts.js matching the LLM fallback pattern. 9. install/ directory: PRD must confirm Dockerfile, docker-compose.yml, and setup.sh are required deliverables for M4 Docker deployment milestone.

1. Add VAD (Voice Activity Detection) as explicit M2 requirement with adapter interface matching STT/TTS pattern. 2. Replace cdn.example.com placeholder with real CDN URL or explicitly document local-only fallback as acceptable. 3. Clarify voice latency <2s: add as testable acceptance criterion in M2 or downgrade to non-functional guideline. 4. Add HTTPS/mDNS/LAN tunnel requirement to M3 multi-device section. 5. Clarify sense.js scope: browser-only vs server-side headless — if server-side needed, add as M3/M4 requirement. 6. Confirm heartbeat timeout = 60s as canonical value in M3 DBB.