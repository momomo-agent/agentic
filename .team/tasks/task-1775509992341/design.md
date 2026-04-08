# task-1775509992341 设计 — src/runtime/stt.js

## 文件
`src/runtime/stt.js`

## 接口
```js
export async function init(): Promise<void>
export async function transcribe(audioBuffer: Buffer): Promise<string>
```

## 逻辑
1. `init()` 读取 `profile.stt.provider`，从 `ADAPTERS` map 懒加载对应模块
2. 加载失败时静默 fallback 到 `agentic-voice/openai-whisper`
3. `transcribe()` 校验 buffer 非空，委托给 `adapter.transcribe(audioBuffer)`

## 适配器 map
```js
const ADAPTERS = {
  sensevoice: () => import('agentic-voice/sensevoice'),
  whisper:    () => import('agentic-voice/whisper'),
  default:    () => import('agentic-voice/openai-whisper'),
}
```

## 错误处理
- `adapter` 为 null → 抛出 `Error('not initialized')`
- 空 buffer → 抛出 `Object.assign(new Error('empty audio'), { code: 'EMPTY_AUDIO' })`

## 测试用例
- 正常 buffer → 返回转录文本
- 空 buffer → 抛出 EMPTY_AUDIO
- 未 init → 抛出 not initialized
