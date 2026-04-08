# agentic-service — Architecture

## 依赖关系

```
agentic-service
├── agentic-core      # LLM 调用引擎（streaming, tool use, retry）
├── agentic-sense     # MediaPipe 感知（人脸/手势/物体，浏览器端）
├── agentic-voice     # TTS + STT 统一接口
├── agentic-store     # KV 存储抽象（SQLite/IndexedDB/memory）
└── agentic-embed     # 向量嵌入（bge-m3）
```

## 核心模块

### 1. Detector（硬件检测）

```javascript
// detector/hardware.js
detect() → {
  platform: 'darwin' | 'linux' | 'win32',
  arch: 'arm64' | 'x64',
  gpu: { type: 'apple-silicon' | 'nvidia' | 'amd' | 'none', vram: number },
  memory: number,  // GB
  cpu: { cores: number, model: string }
}

// detector/profiles.js
// 远程拉取 + 本地缓存
getProfile(hardware) → {
  llm: { provider: 'ollama', model: 'gemma4:26b', quantization: 'q8' },
  stt: { provider: 'sensevoice', model: 'small' },
  tts: { provider: 'kokoro', voice: 'default' },
  fallback: { provider: 'openai', model: 'gpt-4o-mini' }
}
```

### 2. Runtime（服务运行时）

每个能力是一个独立模块，统一接口：

```javascript
// runtime/llm.js — 封装 agentic-core
chat(messages, options) → stream
// 自动选择：本地 Ollama 优先，超时/失败 → 云端 fallback

// runtime/stt.js — 封装 agentic-voice
transcribe(audioBuffer) → text

// runtime/tts.js — 封装 agentic-voice
synthesize(text) → audioBuffer
```

### 3. Server（HTTP/WebSocket）

从 Ambient Hub 提取，简化：

```javascript
// server/hub.js — 设备管理
// server/brain.js — LLM 推理 + 工具调用
// server/api.js — REST API

// API 端点
POST /api/chat       { message, history } → stream
POST /api/transcribe { audio } → { text }
POST /api/synthesize { text } → audio
GET  /api/status     → { hardware, profile, devices }
GET  /api/config     → current config
PUT  /api/config     → update config
```

### 4. UI（Web 前端）

轻量 Vue 3 + Vite，两个页面：
- `/` — 用户对话界面（文本 + 语音）
- `/admin` — 管理面板（硬件信息、配置、设备、日志）

## 安装流程

```bash
# 方式 1: npx（推荐）
npx agentic-service

# 方式 2: 全局安装
npm i -g agentic-service
agentic-service

# 方式 3: Docker
docker run -p 3000:3000 momomo/agentic-service
```

首次启动流程：
1. 检测硬件
2. 拉取 profiles.json
3. 匹配最优配置
4. 检查/安装 Ollama
5. 拉取推荐模型（显示进度）
6. 启动服务
7. 打开浏览器 → http://localhost:3000

## 目录结构

```
agentic-service/
├── package.json
├── bin/
│   └── agentic-service.js    # CLI 入口
├── src/
│   ├── detector/
│   │   ├── hardware.js
│   │   ├── profiles.js
│   │   └── optimizer.js
│   ├── runtime/
│   │   ├── llm.js
│   │   ├── stt.js
│   │   ├── tts.js
│   │   ├── sense.js
│   │   └── memory.js
│   ├── server/
│   │   ├── hub.js
│   │   ├── brain.js
│   │   └── api.js
│   └── ui/
│       ├── client/
│       └── admin/
├── profiles/
│   └── default.json          # 内置默认配置
├── install/
│   ├── setup.sh
│   ├── Dockerfile
│   └── docker-compose.yml
└── test/
```
