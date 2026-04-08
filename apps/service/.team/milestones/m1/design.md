# M1: 硬件检测 + 一键启动 - Technical Design

## 架构概览

```
CLI Entry (bin/agentic-service.js)
  ↓
Setup Flow
  ├── Hardware Detection (src/detector/hardware.js)
  ├── Profile Matching (src/detector/profiles.js)
  ├── Ollama Setup (src/detector/optimizer.js)
  └── Service Start
       ↓
HTTP Server (src/server/api.js)
  ├── /api/chat → LLM Runtime (src/runtime/llm.js)
  ├── /api/status → Hardware Info
  └── Static Files → Web UI (src/ui/client/)
```

## 技术选型

### 硬件检测
- **os** 模块: platform, arch, cpus, totalmem
- **systeminformation** (npm): GPU 检测（type, vram）
- **child_process**: 执行 `nvidia-smi`, `system_profiler` 等命令

### HTTP 服务
- **express**: 轻量 HTTP 框架
- **cors**: 开发模式 CORS 支持
- **express-static**: 静态文件服务

### LLM Runtime
- **agentic-core**: 统一 LLM 接口（Ollama + OpenAI fallback）
- **node-fetch**: HTTP 请求（Ollama API）
- **eventsource-parser**: SSE 流解析

### Web UI
- **Vue 3**: 响应式 UI 框架
- **Vite**: 快速构建工具
- **fetch API**: 调用后端 API

### CLI
- **commander**: 命令行参数解析
- **ora**: 进度条和 spinner
- **chalk**: 终端颜色输出
- **open**: 自动打开浏览器

## 数据流

### 首次启动流程
```
1. CLI 入口
   ↓
2. 检测硬件 (hardware.js)
   → { platform, arch, gpu, memory, cpu }
   ↓
3. 拉取 profiles (profiles.js)
   → 从 CDN 或本地缓存
   ↓
4. 匹配配置 (optimizer.js)
   → { llm, stt, tts, fallback }
   ↓
5. 检查 Ollama
   → 未安装: 提示/自动安装
   → 已安装: 拉取推荐模型
   ↓
6. 启动 HTTP 服务 (api.js)
   → 监听 3000 端口
   ↓
7. 打开浏览器
   → http://localhost:3000
```

### 对话流程
```
User Input (Web UI)
  ↓
POST /api/chat { message, history }
  ↓
LLM Runtime (runtime/llm.js)
  ├── 尝试本地 Ollama
  │   → 成功: 返回 streaming response
  │   → 失败/超时: fallback
  └── Fallback 到云端 API
      → 返回 streaming response
  ↓
Web UI 流式显示
```

## 配置管理

### profiles.json 格式
```json
{
  "version": "1.0.0",
  "profiles": [
    {
      "match": {
        "platform": "darwin",
        "arch": "arm64",
        "gpu": "apple-silicon",
        "minMemory": 16
      },
      "config": {
        "llm": {
          "provider": "ollama",
          "model": "gemma4:26b",
          "quantization": "q8"
        },
        "stt": {
          "provider": "sensevoice",
          "model": "small"
        },
        "tts": {
          "provider": "kokoro",
          "voice": "default"
        },
        "fallback": {
          "provider": "openai",
          "model": "gpt-4o-mini"
        }
      }
    }
  ]
}
```

### 本地配置存储
- 路径: `~/.agentic-service/config.json`
- 内容: 当前使用的配置 + 用户自定义覆盖
- 更新: `PUT /api/config` 持久化到此文件

## 错误处理策略

### 网络错误
- profiles.json 拉取失败 → 使用 profiles/default.json
- Ollama 模型拉取失败 → 提示用户，继续启动（使用 fallback）

### 服务错误
- 端口占用 → 尝试 3001-3010，全部失败则报错退出
- Ollama 未响应 → 自动切换到 fallback API

### 用户错误
- 无效配置 → 验证并提示具体错误字段
- 模型不存在 → 提示可用模型列表

## 测试策略

### 单元测试
- `detector/hardware.js`: mock systeminformation 输出
- `detector/profiles.js`: mock fetch 和文件系统
- `runtime/llm.js`: mock Ollama API 响应

### 集成测试
- 完整启动流程（使用 mock Ollama）
- API 端点测试（supertest）
- 配置持久化测试

### 手动测试
- 不同硬件环境（macOS/Linux/Windows）
- 网络断开场景
- Ollama 未安装场景
