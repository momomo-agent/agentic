# 向量嵌入运行时

## Progress

- Created `src/runtime/embed.js`
- Implements `embed(text)` → float32 array via `agentic-embed`
- Empty string returns `[]`, non-string throws TypeError
