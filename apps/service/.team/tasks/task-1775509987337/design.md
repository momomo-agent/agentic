# task-1775509987337 设计 — src/runtime/llm.js

## 文件
`src/runtime/llm.js`

## 接口
```js
export async function* chat(message: string, options?: { history?: Message[] }): AsyncGenerator<Chunk>
// Chunk: { type: 'content', content: string, done: boolean } | { type: 'meta', provider: string }
```

## 逻辑
1. `loadConfig()` 懒加载硬件检测 + profile（单例缓存）
2. 先尝试 `chatWithOllama(messages)`，使用 `AbortSignal.timeout(30000)`
3. Ollama 失败 → warn + fallback：yield `{ type:'meta', provider:'cloud' }`
4. 按 `profile.fallback.provider` 路由到 `chatWithOpenAI` 或 `chatWithAnthropic`

## 内部函数
```js
async function loadConfig(): Promise<Config>
async function* chatWithOllama(messages): AsyncGenerator<Chunk>
async function* chatWithOpenAI(messages, model): AsyncGenerator<Chunk>
async function* chatWithAnthropic(messages, model): AsyncGenerator<Chunk>
```

## 错误处理
- Ollama 超时/非200 → 静默 fallback，不抛出
- 云端 API key 缺失 → 抛出 `Error('ANTHROPIC_API_KEY not set')` 等
- 不支持的 fallback provider → 抛出 `Error('Unsupported fallback provider')`

## 测试用例
- Ollama 正常返回 → 流式 content chunks
- Ollama 超时 → fallback 到云端，先有 meta chunk
- 无 API key → 抛错
