# agentic-service — Vision

## 一句话

一键部署的本地 AI 服务，让任何人在自己的设备上拥有一个私人 AI 助手。

## 问题

现在要在本地跑一个完整的 AI 服务，你需要：
1. 装 Ollama，选对模型和量化版本
2. 配 STT（SenseVoice / Whisper），装依赖
3. 配 TTS（Kokoro / Piper / 云端）
4. 跑感知服务（MediaPipe / 摄像头）
5. 写一堆胶水代码把它们串起来
6. 搞 HTTPS / 内网穿透 / 多设备连接

这对普通用户来说门槛太高。对开发者来说也很烦。

## 解决方案

**agentic-service = agentic 家族的组装产品。**

把 agentic-core（LLM）、agentic-sense（感知）、agentic-voice（语音）、agentic-store（存储）等零件打包成一个可部署的服务。

核心特性：
1. **硬件自适应** — 启动时检测硬件（GPU/内存/架构），自动选择最优模型配置
2. **一键部署** — `npx agentic-service` 或 Docker，自动下载依赖和模型
3. **本地优先 + 云端 fallback** — 默认全本地，网络不好或硬件不够时自动切云端
4. **多设备协同** — 手机/平板/电脑连到同一个 AI 大脑（继承 Ambient Hub 架构）
5. **动态配置** — 远程 profiles.json，模型更新后自动推荐新配置

## 架构

```
agentic-service
├── detector/          # 硬件检测 + 配置生成
│   ├── hardware.js    # GPU/内存/架构检测
│   ├── profiles.js    # 远程配置拉取 + 本地缓存
│   └── optimizer.js   # 根据硬件选最优配置
├── runtime/           # 服务运行时
│   ├── llm.js         # agentic-core 封装（本地 Ollama + 云端 fallback）
│   ├── stt.js         # 语音识别（SenseVoice / Whisper / 云端）
│   ├── tts.js         # 语音合成（Kokoro / Piper / 云端）
│   ├── sense.js       # 感知（agentic-sense MediaPipe）
│   └── memory.js      # 记忆（agentic-store）
├── server/            # HTTP/WebSocket 服务
│   ├── hub.js         # 设备管理 + 消息路由
│   ├── brain.js       # LLM 推理 + 工具调用
│   └── api.js         # REST API
├── ui/                # Web 前端
│   ├── client/        # 用户界面
│   └── admin/         # 管理面板（配置/设备/日志）
└── install/           # 安装脚本
    ├── setup.sh       # Unix 一键安装
    ├── Dockerfile     # Docker 部署
    └── docker-compose.yml
```

## 与 Ambient Hub 的关系

agentic-service **不是** Ambient Hub 的重写，而是它的**产品化提炼**。

Ambient Hub 是实验场（功能多、架构灵活、我们自己用），agentic-service 是产品（精简、稳定、任何人都能用）。

核心代码从 Ambient Hub 提取，但：
- 去掉实验性功能
- 简化配置（开箱即用 > 灵活可配）
- 加上硬件检测和自动配置
- 加上一键安装脚本

## 目标用户

1. **想在家跑 AI 的技术爱好者** — 有 Mac / GPU PC，想要隐私 + 低延迟
2. **开发者** — 想在自己的项目里集成本地 AI 能力
3. **小团队** — 内网部署的团队 AI 助手

## 非目标

- 不做云服务（用户自己部署）
- 不做 SaaS（没有账户系统）
- 不替代 OpenClaw / ChatGPT（定位是本地基础设施，不是聊天产品）

## 成功标准

- `npx agentic-service` 在 M4 Mac 上 5 分钟内完成首次安装 + 启动
- 本地语音对话延迟 < 2s（STT + LLM + TTS 全链路）
- 支持至少 3 种硬件配置（Apple Silicon / NVIDIA / CPU-only）
