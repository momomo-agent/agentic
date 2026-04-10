# Task Design: Update VISION.md directory tree to match actual file names

**Task ID:** task-1775847821786
**Module:** N/A — VISION.md is a project-level document (architect-owned)
**Assignee:** architect

## Problem

VISION.md §架构 directory tree references stale file names that don't exist in the codebase:

| VISION.md references | Actual file(s) | Status |
|----------------------|-----------------|--------|
| `detector/optimizer.js` | `detector/matcher.js` (+ `profiles.js`) | ❌ No optimizer.js exists |
| `runtime/llm.js` | `server/brain.js` (+ `engine/registry.js`) | ❌ No runtime/llm.js exists |
| `runtime/memory.js` | `store/index.js` + `runtime/embed.js` | ❌ No runtime/memory.js exists |
| (missing) `engine/` directory | `engine/{registry,init,ollama,cloud,whisper,tts}.js` | ❌ Not listed |
| (missing) `config.js` | `src/config.js` | ❌ Not listed |

## File to Modify

| File | Section | Change |
|------|---------|--------|
| `VISION.md` (lines 34-57) | `## 架构` code block | Replace stale tree with accurate one |

## Proposed New Tree

```
agentic-service
├── detector/          # 硬件检测 + 配置生成
│   ├── hardware.js    # GPU/内存/架构检测
│   ├── profiles.js    # 远程配置拉取 + 本地缓存
│   ├── matcher.js     # 根据硬件选最优配置
│   └── ollama.js      # Ollama 自动安装 + 模型拉取
├── engine/            # 多引擎注册中心
│   ├── registry.js    # 引擎注册/发现/路由
│   ├── init.js        # 引擎启动
│   ├── ollama.js      # Ollama 引擎
│   ├── cloud.js       # 云端引擎工厂
│   ├── whisper.js     # Whisper STT 引擎
│   └── tts.js         # TTS 引擎
├── config.js          # 统一配置中心
├── runtime/           # 服务运行时
│   ├── stt.js         # 语音识别（多提供商自适应）
│   ├── tts.js         # 语音合成（多提供商自适应）
│   ├── sense.js       # 感知（agentic-sense MediaPipe）
│   ├── embed.js       # 向量嵌入（agentic-embed）
│   └── vad.js         # 语音活动检测
├── store/             # 存储
│   └── index.js       # KV 存储（agentic-store）
├── server/            # HTTP/WebSocket 服务
│   ├── hub.js         # 设备管理 + 消息路由
│   ├── brain.js       # LLM 推理 + 工具调用 + 云端 fallback
│   └── api.js         # REST API
├── ui/                # Web 前端
│   ├── client/        # 用户界面
│   └── admin/         # 管理面板
└── install/           # 安装脚本
    ├── setup.sh       # Unix 一键安装
    ├── Dockerfile     # Docker 部署
    └── docker-compose.yml
```

## Verification

After change, every file listed in the tree should exist:
```bash
ls src/detector/{hardware,profiles,matcher,ollama}.js
ls src/engine/{registry,init,ollama,cloud,whisper,tts}.js
ls src/config.js
ls src/runtime/{stt,tts,sense,embed,vad}.js
ls src/store/index.js
ls src/server/{hub,brain,api}.js
```

## Test Cases

No code tests — this is a documentation-only change. Verification is manual: confirm all listed paths exist.

## ⚠️ Notes

- This task modifies VISION.md which is architect-owned. Tech lead provides design only.
- The tree intentionally stays high-level (matching VISION.md's purpose as a product vision doc) — it doesn't list every adapter or utility file.
- Per CR-1775847503256, this change would improve vision match from ~91% to ~95%+.
