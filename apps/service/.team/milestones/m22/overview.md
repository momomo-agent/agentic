# M22: Runtime层修复 (llm/stt/tts/sense/memory)

## Goals
- 实现 src/runtime/llm.js — chat(messages, options) → stream，支持 Ollama + 云端回退
- 实现 src/runtime/stt.js — transcribe(audioBuffer) → text，SenseVoice/Whisper/云端适配
- 实现 src/runtime/tts.js — synthesize(text) → audioBuffer，Kokoro/Piper/云端适配
- 实现 src/runtime/sense.js — MediaPipe 感知运行时
- 实现 src/runtime/memory.js — 向量记忆运行时（agentic-store + agentic-embed）

## Acceptance Criteria
- llm.js: chat() 返回 async stream，Ollama 优先，失败自动切换 OpenAI/Anthropic
- stt.js: transcribe() 接受 Buffer，返回文本字符串
- tts.js: synthesize() 接受文本，返回 AudioBuffer
- sense.js: 导出 start()/stop()，支持人脸/手势检测
- memory.js: 导出 store()/retrieve()，基于向量嵌入
- architecture match 从 18% 提升至 ≥80%

## Scope
Targets architecture gaps: runtime layer (llm/stt/tts/sense/memory).
Blocked until m21 completes (detector + admin route).
