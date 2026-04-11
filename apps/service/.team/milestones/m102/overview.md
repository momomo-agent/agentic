# M102: OpenAI 兼容 API 全覆盖

## 目标

所有能力暴露为 OpenAI 标准格式 API，任何支持 OpenAI API 的客户端都能直接接入。

## 背景

目前只有 `/v1/chat/completions` 和 `/v1/models` 是标准格式。STT/TTS/Embedding 都是自定义路由。

## Features

### F1: `/v1/embeddings` — 向量嵌入 API
- 请求格式：`{ model, input }` （input 可以是 string 或 string[]）
- 响应格式：`{ object: "list", data: [{ object: "embedding", embedding: [...], index: 0 }], model, usage }`
- 通过 engine registry 路由到 Ollama embedding 模型或本地 agentic-embed

### F2: `/v1/audio/transcriptions` — 语音识别 API
- 请求格式：multipart/form-data，字段 `file`（音频文件）、`model`（可选）、`language`（可选）
- 响应格式：`{ text }` 或 verbose JSON（含 segments/words）
- 通过 engine registry 路由到 whisper/sensevoice

### F3: `/v1/audio/speech` — 语音合成 API
- 请求格式：`{ model, input, voice, response_format, speed }`
- 响应：音频流（mp3/wav/opus）
- 通过 engine registry 路由到 kokoro/piper/macos-say

### F4: Streaming STT（实时语音流）
- WebSocket 端点 `/v1/audio/stream`
- 客户端发送音频 chunk，服务端实时返回转写文本
- VAD 集成：自动检测语音段落

### F5: Pipeline API — `/v1/pipeline`
- 请求：音频/文本/图片输入
- 自动路由：audio → STT → LLM → TTS → audio 输出
- 响应：streaming，先返回文本再返回音频
- 配置：可选跳过某些步骤（如只要 STT→LLM 不要 TTS）

## 验收标准

- OpenAI Python SDK `openai.embeddings.create()` 能直接调通
- OpenAI Python SDK `openai.audio.transcriptions.create()` 能直接调通
- OpenAI Python SDK `openai.audio.speech.create()` 能直接调通
- Pipeline API 端到端延迟 < 2s（本地模型）
- 所有新 API 有对应测试
