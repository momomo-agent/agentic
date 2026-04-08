# Design: server/brain.js LLM推理

## 文件
- `src/server/brain.js` — 新建

## 接口
```js
import { chat as llmChat } from '../runtime/llm.js'

export async function* chat(messages, tools = [])
// yield { type: 'content', content: string, done: boolean }
// yield { type: 'tool_call', name: string, args: object }
```

## 逻辑
1. 调用 `llmChat(messages, { tools })`
2. 透传 content chunks
3. 遇到 tool_call chunk → yield tool_call 事件
4. llmChat 抛出 → 自动 fallback（llm.js 内部处理）

## 测试
- 正常对话 yield content chunks
- tool call 时 yield tool_call 事件
- llm 失败时不抛出（fallback 在 llm.js 层）
