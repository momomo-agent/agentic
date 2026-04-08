# Agentic

> 给 AI 造身体的零件箱

一套模块化的 JavaScript 库，让你能组装出有感知、有记忆、能行动的 AI agent。

## 架构

```
packages/          # 零件（可被引用的库）
├── core/          # 大脑 - LLM 调用基础
├── store/         # 骨骼 - SQLite 持久化
├── memory/        # 记忆 - 短期+长期记忆系统
├── sense/         # 眼睛 - MediaPipe 感知
├── act/           # 意志 - 意图→决策→执行
├── voice/         # 声音 - TTS + STT
├── render/        # 表达 - Markdown 渲染
├── embed/         # 嵌入 - 向量化
├── filesystem/    # 文件系统 - 虚拟 FS
├── shell/         # 命令执行
├── spatial/       # 空间推理
└── claw/          # 完整 agent 运行时

apps/              # 产品（可运行/可部署）
├── lite/          # 轻量 web 版
├── service/       # 后台服务
└── docs/          # 官网 + 文档
```

## 快速开始

### 安装

```bash
git clone https://github.com/momomo-agent/agentic.git
cd agentic
pnpm install
```

### 使用单个库

```bash
# 在你的项目里
git submodule add https://github.com/momomo-agent/agentic.git lib/agentic
```

```json
{
  "dependencies": {
    "agentic-core": "file:./lib/agentic/packages/core",
    "agentic-voice": "file:./lib/agentic/packages/voice"
  }
}
```

### 开发

```bash
pnpm dev          # 所有包并行 dev
pnpm build        # 构建所有包
pnpm test         # 跑所有测试
```

## 设计哲学

每个模块对应 AI 的一个"器官"：

- **sense** = 眼睛，看到世界
- **core** = 大脑，思考
- **act** = 意志，做决定
- **voice** = 嘴巴，说话
- **memory** = 海马体，记忆
- **store** = 骨骼，结构
- **render** = 表达，呈现
- **claw** = 完整的身体

组合这些器官，你能造出任何形态的 AI。

## License

MIT
