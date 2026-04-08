# Design: src/server/brain.js

## Status
File exists (118 lines). Implementation complete.

## Interface
```js
export function registerTool(name: string, fn: Function): void
export async function* chat(messages: Message[], tools?: Tool[]): AsyncGenerator<Chunk>
```

## Logic
1. `normalizeMessages` — convert tool result messages to Anthropic format
2. `chatWithTools(messages, tools)` — Ollama native tools API (stream), fallback to Anthropic
3. Tool execution loop: on `tool_use` chunk → call registered tool → append result → recurse
4. Yields: `{type:'content', text, done}` | `{type:'tool_use', id, name, input}`

## Error Handling
- Ollama timeout 30s → fallback to Anthropic
- Unknown tool name → yield error content chunk

## Test Cases
- `chat([{role:'user',content:'hi'}])` yields content chunks
- Registered tool gets called on tool_use event
