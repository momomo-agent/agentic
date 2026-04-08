# 技术设计 — 实现 src/runtime/llm.js

## 文件
- `src/runtime/llm.js` (修改)

## 现状分析
当前实现已基本完整，需验证以下接口契约：
- `chat(message, options)` — 第一参数为 string，非 messages 数组
- `options.history` — 历史消息数组，默认 `[]`
- yield 格式：`{ type: 'content'|'meta', content?, provider?, done? }`

## 接口
```js
export async function* chat(message: string, options?: { history?: Message[] }): AsyncGenerator<Chunk>
// Chunk: { type: 'content', content: string, done: boolean } | { type: 'meta', provider: string }
```

## 逻辑
1. `messages = [...history, { role: 'user', content: message }]`
2. 尝试 `chatWithOllama(messages)`，超时 30s
3. 失败 → yield `{ type: 'meta', provider: 'cloud' }` → 按 config.fallback.provider 路由
4. 支持 `openai` / `anthropic` 两种 fallback

## 边界情况
- `message` 为空字符串：允许通过（由调用方校验）
- Ollama 未启动：fetch 抛出 → 自动 fallback
- 两个 API key 均未设置：抛出明确错误

## 测试用例
- Ollama 正常时 yield content chunks
- Ollama 失败时 yield meta + cloud chunks
- history 正确拼接到 messages
