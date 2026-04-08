# Design: src/server/brain.js

## Interface
```js
export function registerTool(name: string, fn: Function): void
export async function* chat(messages, options = {}): AsyncGenerator
// yields: { type: 'content', text: string, done: boolean }
// yields: { type: 'tool_use', id, name, input }
// yields: { type: 'error', error: string }
```

## Logic
1. `tools` Map: name → fn (registered tools)
2. `chat()`: merge options.tools + registered tools, delegate to `chatWithTools(messages, mergedTools)`
3. `chatWithTools`: try Ollama with tools in body; parse tool_calls and content chunks
4. On Ollama tool_use failure → fall back to OpenAI with function calling
5. Wrap in try/catch → yield `{ type:'error', error }` on failure

## Error Handling
- Ollama non-200: throw, caught by fallback
- OpenAI missing key: throw `Error('OPENAI_API_KEY not set')`
- All errors caught at `chat()` level → yield error chunk

## Dependencies
- `../runtime/llm.js` → `chat` (used indirectly via direct Ollama/OpenAI calls)

## Test Cases
- No tools: streams content chunks
- Tool registered: yields tool_use chunk on trigger
- Ollama down: falls back to OpenAI
- All providers fail: yields error chunk
