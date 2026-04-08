# Milestone m1: M1: 硬件检测 + 一键启动

## Goals

实现 agentic-service 的核心基础设施：硬件自适应检测、自动模型选择、一键启动本地 AI 服务。

用户只需运行 `npx agentic-service`，系统自动完成硬件检测、Ollama 安装、模型下载、服务启动，并打开 Web UI 进行文本对话。

## Scope

### In Scope
1. **硬件检测器** (detector/hardware.js) - 检测 GPU 类型、显存/内存、CPU 架构、OS
2. **远程配置** (detector/profiles.js) - 从 CDN 拉取硬件配置推荐表，本地缓存，支持离线
3. **Ollama 集成** (runtime/llm.js) - 自动检测/安装 Ollama，拉取推荐模型，显示进度
4. **基础 HTTP 服务** (server/api.js) - REST API 接受文本输入返回 LLM 回复，基于 agentic-core
5. **Web UI 最小版** (ui/client) - 一个对话框能打字聊天，Vue 3 + Vite
6. **CLI 入口** (bin/agentic-service.js) - npx 或全局安装，首次启动自动配置

### Out of Scope
- 语音交互 (M2)
- 多设备连接 (M3)
- 云端 fallback (M4)
- 管理面板 (M3)

## Success Criteria

- [ ] 在 M4 Mac mini 上 `npx agentic-service` 能自动检测硬件并推荐 gemma4
- [ ] 首次安装（含模型下载）< 10 分钟
- [ ] 非首次启动 < 10 秒
- [ ] 文本对话可用（发送消息 → 收到 LLM 回复）
- [ ] 硬件检测输出正确的 JSON 格式（platform, arch, gpu, memory, cpu）
- [ ] 离线模式下能使用本地缓存的 profiles
- [ ] Ollama 安装失败时有清晰的错误提示

## Dependencies

所有任务依赖 agentic-core 包（LLM 调用引擎），需要在 package.json 中声明依赖。

## Architecture Alignment

参考 ARCHITECTURE.md 第 16-36 行（Detector）、38-52 行（Runtime）、54-70 行（Server）、72-77 行（UI）、79-100 行（安装流程）。

