# agentic-service — Vision

## 一句话

本地优先的 AI 能力供应层 — 一行命令启动，所有 AI 能力开箱即用。

## 定位

**AgenticService 是能力层，不是业务层。**

我们提供 chat、vision、STT、TTS、embedding 这些原子能力，业务代码来调用。就像操作系统提供文件系统、网络、GPU 驱动，但不管你拿它写什么 App。

不做记忆、不做 session 管理、不做 agent 框架。只做能力供应。

## 架构

```
业务 App（聊天机器人 / 语音助手 / 智能家居 / ...）
  ↓
AgenticClient（前端 SDK，agentic-* 家族统一封装）
  ↓
AgenticService（后端运行时，能力供应 + 引擎路由）
  ↓
引擎层（Ollama / Whisper / Kokoro / Cloud API / ...）
```

### AgenticService = 后端运行时

- 引擎管理：自动发现、注册、健康检查
- 模型路由：根据能力需求路由到最合适的引擎和模型
- 硬件自适应：检测硬件，自动选择最优配置
- 本地优先 + 云端 fallback：本地能跑就本地跑，跑不了自动切云端

### AgenticClient = 前端 SDK

- agentic-core / agentic-sense / agentic-voice / agentic-render / agentic-store / agentic-embed 的统一入口
- 开箱即用，业务层引入一个 Client 所有能力都有
- 两种模式：纯端侧（直接调本地引擎）/ 连 Service（重活丢给后端）

## 核心价值

1. **能力发现与路由** — 你调 `/v1/chat`，我帮你路由到最合适的模型和引擎
2. **多模态能力统一** — chat/vision/stt/tts/embedding 全部统一 API
3. **本地优先 + 云端 fallback** — 业务层完全不感知切换
4. **硬件自适应** — 检测硬件，自动选择最优模型配置

## 非目标

- 不做记忆 / session / agent 逻辑（业务层的事）
- 不做云服务 / SaaS
- 不替代 OpenClaw / ChatGPT（我们是基础设施）

## 成功标准

- `npx agentic-service` 在任何机器上 5 分钟内完成首次安装 + 启动
- 所有能力 API 兼容 OpenAI 标准格式
- 本地语音管道延迟 < 2s（STT + LLM + TTS）
- 任何引擎挂了自动降级，业务层无感知
