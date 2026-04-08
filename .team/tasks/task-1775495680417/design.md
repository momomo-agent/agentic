# Design: DBB 规范修复 (task-1775495680417)

## Files to Modify

### 1. `src/runtime/memory.js` — del() → delete()
- Ensure `delete(key)` is exported (rename or alias `del` → `delete`)
- If using agentic-store, wrap: `export const delete = (key) => store.del(key)` or use bracket notation

### 2. `src/server/brain.js` — tool_use 响应格式
Current: `{ role: 'tool', tool_use_id, content }`
Fix: ensure format matches Anthropic spec exactly:
```js
{ role: 'user', content: [{ type: 'tool_result', tool_use_id, content: String(result) }] }
```
Also ensure `input` from Ollama tool_calls is parsed:
```js
input: typeof tc.function.arguments === 'string'
  ? JSON.parse(tc.function.arguments)
  : tc.function.arguments
```

### 3. `bin/agentic-service.js` — SIGINT 优雅关闭
Add after `startServer()` resolves:
```js
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});
```
`startServer()` must return the http.Server instance.

### 4. `src/detector/profiles.js` — CDN URL 验证
- Current URL: `https://cdn.jsdelivr.net/gh/momomo-ai/agentic-service@main/profiles/default.json`
- Verify URL is reachable; fallback chain already correct (remote → expired cache → builtin)
- No code change needed if URL is valid; if 404, update to correct URL

### 5. `src/detector/optimizer.js` — 模型下载进度
- `pullModel(modelName, onProgress)` already calls `onProgress(percent, speed)`
- Verify `onProgress` callback at call site (line 33) actually renders output
- Fix: ensure spinner updates with percent: `spinner.text = \`Pulling ${modelName}: ${percent}%\``

## Edge Cases
- `delete` is a reserved word in JS — use `store['delete']` or rename export carefully
- SIGINT handler must not double-close if server already closed
- `JSON.parse` on already-object `arguments` → guard with typeof check

## Test Cases
- `store.delete(key)` → no TypeError
- tool_result message accepted by Anthropic API (no 400)
- SIGINT → process exits within 5s, port released
- Model pull shows progress in terminal
