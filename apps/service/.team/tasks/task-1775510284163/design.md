# Design: 实现 src/server/brain.js

## File
- `src/server/brain.js` (create)

## Interface
```js
import { chat as llmChat } from '../runtime/llm.js';

const tools = new Map(); // name → fn

export function registerTool(name: string, fn: Function): void

export async function* chat(
  messages: Array<{role: string, content: string}>,
  options: object
): AsyncGenerator<string>
// Delegates to llmChat(messages, { tools: [...tools.entries()], ...options })
// Yields string chunks from stream
```

## Algorithm
1. Build tools array from registered tools map
2. Call `llmChat(messages, { ...options, tools })`
3. For each chunk in stream, yield chunk
4. If tool call detected in stream → invoke registered fn, append result to messages, recurse

## Edge Cases
- `llmChat` throws → propagate error (caller handles)
- Unknown tool called by LLM → yield error message chunk, continue

## Dependencies
- `src/runtime/llm.js` — `chat(messages, options) → stream`

## Test Cases
- `chat([{role:'user',content:'hi'}], {})` yields at least one string (mock llm.js)
- Registered tool gets called when LLM requests it
