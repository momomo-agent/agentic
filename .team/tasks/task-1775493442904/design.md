# Design: LLM 工具调用 brain.js

## File
- `src/server/brain.js` (create)
- `src/server/api.js` (modify: replace inline chat handler with brain.js)

## Interface

```js
// chat(messages, options) → AsyncGenerator<chunk>
// options: { tools?: ToolDef[], history?: Message[] }
// chunk: { type: 'content'|'tool_use'|'error', ... }
export async function* chat(messages, options = {}) {}
```

## Logic

1. Accept `tools` array in request body (optional)
2. Pass `tools` to `agentic-core` chat call
3. Yield chunks as-is from agentic-core:
   - `{ type: 'content', content: string }` for text
   - `{ type: 'tool_use', id, name, input }` for tool calls
4. If no `tools` provided, behave identically to current `llm.js` chat

## api.js Change

```js
// POST /api/chat — add tools support
const { message, history = [], tools } = req.body;
// pass tools to chat()
for await (const chunk of chat(message, { history, tools })) {
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
}
```

## Error Handling
- Invalid `tools` format → let agentic-core throw; surface as `{ error: message }`
- Ollama fallback: if tools unsupported by Ollama, fall back to cloud provider

## Dependencies
- `agentic-core` (external package)
- Blocked by: task-1775493437268 (embed), task-1775493442807 (store) — brain.js may use memory/embed internally in future; for now just tool_use

## Test Cases (DBB-008, DBB-009)
- POST `/api/chat` with `tools` + triggering message → response contains `type: "tool_use"` chunk
- POST `/api/chat` without `tools` → response contains `type: "content"` text chunk, HTTP 200
