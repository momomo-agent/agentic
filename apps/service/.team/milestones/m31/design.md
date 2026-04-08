# M31 技术设计 — Runtime层全实现

## 方案

所有 runtime 模块遵循统一模式：
1. `init()` — 按 profile 加载 adapter，失败 fallback 到 default
2. 核心函数 — 调用 adapter，输入校验，错误附 code

## 模块

### llm.js
- 已实现：Ollama streaming + Anthropic/OpenAI fallback，profile热更新
- 接口：`chat(messages, options?) → AsyncGenerator<{type,content,done}>`

### stt.js
- 已实现：sensevoice/whisper/openai-whisper adapter 动态加载
- 接口：`init() → Promise<void>`，`transcribe(audioBuffer) → Promise<string>`

### tts.js
- 已实现：kokoro/piper/openai-tts adapter 动态加载
- 接口：`init() → Promise<void>`，`synthesize(text) → Promise<Buffer>`

## 依赖
- `src/detector/profiles.js` — getProfile()
- `src/detector/hardware.js` — detect()
- `agentic-voice/*` — STT/TTS adapters
