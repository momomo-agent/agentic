# M18 技术设计 — Runtime层实现

## 目标
实现 `src/runtime/` 下5个模块，使架构对齐率从18%提升至~50%。

## 模块概览

| 模块 | 接口 | 依赖 |
|------|------|------|
| llm.js | `chat(message, options) → AsyncGenerator` | agentic-core, detector/ |
| stt.js | `init()`, `transcribe(audioBuffer) → string` | agentic-voice |
| tts.js | `init()`, `synthesize(text) → Buffer` | agentic-voice |
| sense.js | `init(video)`, `detect(frame)`, `start()`, `stop()`, `on()` | agentic-sense |
| memory.js | `add(text)`, `search(query, topK)`, `remove(key)` | agentic-store, agentic-embed |

## 关键设计决策

### llm.js — 本地优先 + 云端 fallback
- 使用 `AbortSignal.timeout(30000)` 控制 Ollama 超时
- fallback provider 由 `profile.fallback` 决定（openai/anthropic）
- 所有 chunk 统一格式：`{ type, content, done }`

### stt.js / tts.js — 适配器模式
- `ADAPTERS` map 按 provider 名懒加载
- `init()` 失败时静默 fallback 到默认适配器
- 未调用 `init()` 时调用功能接口抛 `Error('not initialized')`

### sense.js — 事件驱动
- `setInterval(100ms)` 轮询 video frame
- `on(type, handler)` 注册监听，`emit()` 内部分发
- `detect(frame)` 同步调用，pipeline 未初始化返回空结构

### memory.js — 串行写入 + 余弦检索
- `_lock` Promise 链保证 `add()` 串行执行
- `INDEX_KEY = 'mem:__index__'` 维护 id 列表
- `search()` 全量加载后内存排序（适合小规模记忆）

## 文件路径
```
src/runtime/llm.js
src/runtime/stt.js
src/runtime/tts.js
src/runtime/sense.js
src/runtime/memory.js
```
