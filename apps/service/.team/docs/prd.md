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
