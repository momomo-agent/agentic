# Design: src/server/brain.js

## Status
File already exists at `src/server/brain.js` with full implementation.

## Interface
```javascript
registerTool(name: string, fn: Function): void
chat(messages: Array<{role, content}>, options?: object): AsyncGenerator<{type: 'content'|'done', text?: string}>
```

## Key Logic
- `chat` normalizes messages (converts `role:'tool'` to `role:'user'` with `tool_result` content)
- Tries Ollama first (`http://localhost:11434/api/chat`) with 30s timeout
- Streams NDJSON response, yields `{type:'content', text}` chunks
- Falls back to cloud provider on Ollama failure

## Edge Cases
- Ollama not running → fetch throws, fallback activates
- Tool result messages → normalized before sending to Ollama
- Empty message array → passes through, Ollama handles

## Test Cases
- `chat([{role:'user', content:'hi'}])` yields at least one `{type:'content'}` chunk
- `registerTool('test', fn)` stores tool, available for subsequent calls
