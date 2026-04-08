# task-1775509992376 设计 — src/runtime/tts.js

## 文件
`src/runtime/tts.js`

## 接口
```js
export async function init(): Promise<void>
export async function synthesize(text: string): Promise<Buffer>
```

## 逻辑
1. `init()` 读取 `profile.tts.provider`，从 `ADAPTERS` map 懒加载
2. 加载失败时静默 fallback 到 `agentic-voice/openai-tts`
3. `synthesize()` 校验文本非空，委托给 `adapter.synthesize(text)`

## 适配器 map
```js
const ADAPTERS = {
  kokoro:  () => import('agentic-voice/kokoro'),
  piper:   () => import('agentic-voice/piper'),
  default: () => import('agentic-voice/openai-tts'),
}
```

## 错误处理
- `adapter` 为 null → 抛出 `Error('not initialized')`
- 空/空白文本 → 抛出 `Object.assign(new Error('text required'), { code: 'EMPTY_TEXT' })`

## 测试用例
- 正常文本 → 返回 audio Buffer
- 空字符串 → 抛出 EMPTY_TEXT
- 未 init → 抛出 not initialized
