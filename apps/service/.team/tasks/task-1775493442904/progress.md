# LLM 工具调用 brain.js

## Progress

- Created `src/server/brain.js`: `chat(messages, options)` async generator with tools support
- Ollama: passes tools natively, yields `tool_use` chunks from `message.tool_calls`
- Fallback: OpenAI with streaming tool_calls accumulation
- Updated `src/server/api.js`: imports from brain.js, extracts `tools` from body, builds messages array
