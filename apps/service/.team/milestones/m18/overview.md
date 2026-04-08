# M18: Runtime层实现 (llm/stt/tts/sense/memory)

## 目标
实现 src/runtime/ 下5个核心模块，将架构对齐率从18%提升至~50%。

## 范围
- src/runtime/llm.js — chat(messages, options) → stream，封装 agentic-core，本地Ollama优先+云端fallback
- src/runtime/stt.js — transcribe(audioBuffer) → text，封装 agentic-voice
- src/runtime/tts.js — synthesize(text) → audioBuffer，封装 agentic-voice
- src/runtime/sense.js — MediaPipe感知运行时，detect(frame) → results
- src/runtime/memory.js — 记忆模块，封装 agentic-store + agentic-embed

## 验收标准
- 每个模块导出架构规定的接口
- llm.js 支持本地/云端自动切换
- 单元测试覆盖主路径

## 依赖
- 无阻塞依赖，可与M17并行
