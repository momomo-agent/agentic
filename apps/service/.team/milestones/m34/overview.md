# M34: Runtime层实现 — LLM/STT/TTS/Sense/Memory

## 目标
实现架构规范中缺失的所有Runtime层模块（architecture gap: missing）。

## 任务
- task-1775518142616: 实现src/runtime/llm.js — chat(messages,options)→stream
- task-1775518142648: 实现src/runtime/stt.js — transcribe(audioBuffer)→text
- task-1775518142678: 实现src/runtime/tts.js — synthesize(text)→audioBuffer
- task-1775518147793: 实现src/runtime/sense.js — MediaPipe感知运行时
- task-1775518147827: 实现src/runtime/memory.js — 记忆运行时

## 验收标准
- 所有5个runtime模块存在且导出规范接口
- llm.js: 本地Ollama优先，超时自动fallback云端
- stt/tts: 封装agentic-voice统一接口
- architecture match提升至≥50%
