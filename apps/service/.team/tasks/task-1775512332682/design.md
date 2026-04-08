# 技术设计 — 实现 src/runtime/tts.js

## 文件
- `src/runtime/tts.js` (修改)

## 接口
```js
export async function init(): Promise<void>
export async function synthesize(text: string): Promise<Buffer>
```

## 适配器映射
```js
const ADAPTERS = {
  kokoro:  () => import('agentic-voice/kokoro'),
  piper:   () => import('agentic-voice/piper'),
  default: () => import('agentic-voice/openai-tts'),
}
```

## 逻辑
1. `init()`: 读 profile.tts.provider，加载适配器；失败回退 default
2. `synthesize(text)`: 校验非空/非空白，调用 `adapter.synthesize(text)`

## 边界情况
- `init()` 未调用：抛出 `Error('not initialized')`
- 空/空白文本：抛出 `{ code: 'EMPTY_TEXT' }`
- 适配器加载失败：回退 default

## 测试用例
- init() 后 synthesize 返回 Buffer
- 未 init 时抛错
- 空文本抛出 EMPTY_TEXT
