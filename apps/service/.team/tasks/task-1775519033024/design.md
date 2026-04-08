# Design: src/server/brain.js — LLM推理+工具调用

## Files
- `src/server/brain.js` — create

## Interface

```js
class Brain {
  constructor(llmRuntime, memoryRuntime)
  async chat(messages, options)   // → AsyncIterable<string> (stream)
  async tool(name, args)          // → any
  getHistory()                    // → Message[]
  clearHistory()
  addToHistory(role, content)
}
```

## Logic

- `history` = `Message[]` shared across all callers (global brain state)
- `chat(messages, options)`:
  1. Append user message to history
  2. Call `llmRuntime.chat([...history, ...messages], options)` → stream
  3. Collect streamed chunks, append assistant response to history
  4. Yield chunks as they arrive
- `tool(name, args)`: dispatch to registered tool handlers map
- Tool handlers registered via `brain.registerTool(name, fn)`

## Edge Cases
- Stream error: emit error, do not append partial response to history
- Empty messages: throw `Error('messages required')`
- Unknown tool: throw `Error('unknown tool: ${name}')`

## Dependencies
- `src/runtime/llm.js`
- `src/runtime/memory.js`

## Tests
- chat returns stream chunks
- history accumulates across calls
- clearHistory resets state
- unknown tool throws
- stream error does not corrupt history
