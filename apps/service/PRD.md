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

1. **STT 集成** — engine/whisper.js 注册 whisper 引擎，runtime/stt.js 通过适配器选择提供商：sensevoice (apple-silicon) / whisper (nvidia) / cloud (cpu-only)
2. **TTS 集成** — engine/tts.js 注册 TTS 引擎，runtime/tts.js 通过适配器选择提供商：kokoro/piper (本地) / cloud fallback
3. **VAD (Voice Activity Detection)** — 服务端能量检测 VAD (runtime/vad.js) + 客户端 useVAD.js composable
4. **Web UI 语音** — 按住说话 / VAD 自动检测
5. **唤醒词** — 可配置唤醒词（默认 "hey"），audio-level 检测 (runtime/sense.js)

### 技术规格

- **语音延迟** — 端到端 <2s (STT + LLM + TTS)，runtime/profiler.js 强制 2000ms 预算
- **STT/TTS fallback** — 本地失败时自动切云端，匹配 LLM fallback 模式

---

## M3: 多设备 + 感知

**目标：** 多设备连接同一个 AI 大脑，加上视觉感知

### Features

1. **多设备连接** — WebSocket 设备注册/心跳
2. **视觉感知** — sense.js 调用 agentic-sense detect(frame) → {faces, gestures, objects}，支持事件循环 start()/stop()
3. **设备工具** — speak(device) / display(device) / capture(device)，capture 支持超时处理
4. **管理面板** — 从 GET /api/status 获取设备列表，从 GET /api/config 获取配置（无静态文件）
5. **记忆模块** — runtime/memory.js 暴露 search(query, topK) 和 add()，使用 agentic-store (store/index.js) + agentic-embed (runtime/embed.js) 向量嵌入
6. **HTTPS/LAN 隧道** — server/httpsServer.js + server/cert.js 支持 HTTPS；tunnel.js 支持 ngrok/cloudflared 跨网络访问

### 技术规格

- **WebSocket 消息格式** — {type, deviceId, payload, ts}
- **心跳间隔** — 60s (60000ms)
- **注册握手** — 客户端发送 {type: "register", deviceId, capabilities}，服务端响应 {type: "registered", sessionId}
- **store.js API** — 导出 del() 和 delete() 别名

---

## M4: 云端 fallback + 产品打磨

**目标：** 本地不够时自动切云端，整体打磨

### Features

1. **云端 fallback** — brain.js 实现完整 fallback 逻辑：本地 LLM 首 token 超时 >5s 或连续 3 次错误 → 自动切换到配置的云端提供商；60s 探测成功后恢复本地
2. **配置热更新** — watchProfiles() 每 30s 轮询，ETag 条件获取 (detector/profiles.js)
3. **Docker 部署** — docker-compose.yml 暴露端口 1234，挂载 ./data 卷，包含 OLLAMA_HOST 环境变量；install/ 目录包含 Dockerfile、docker-compose.yml、setup.sh
4. **文档 + README** — 完整的用户文档：安装方式（npx/全局/Docker）、API 端点、架构、故障排除
5. **profiles CDN** — GitHub raw URL，4 层 fallback：新鲜缓存 → 远程获取 → 过期缓存 → 内置 default.json

### 技术规格

- **默认端口** — 1234 (bin/agentic-service.js)
- **package.json main** — src/index.js 导出核心 API (startServer, detector, runtime)
- **云端 fallback 触发器** — brain.js 管理 fallback 状态；首 token 超时 >5s (FIRST_TOKEN_TIMEOUT_MS) 或连续 3 次错误 (MAX_ERRORS) 时切换云端，60s 探测恢复 (PROBE_INTERVAL_MS)
- **引擎架构** — engine/registry.js 统一模型发现与路由；engine/init.js 启动时注册 ollama/whisper/tts/cloud 引擎