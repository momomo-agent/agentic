# 技术设计 — 实现 src/runtime/stt.js

## 文件
- `src/runtime/stt.js` (修改)

## 接口
```js
export async function init(): Promise<void>
export async function transcribe(audioBuffer: Buffer): Promise<string>
```

## 适配器映射
```js
const ADAPTERS = {
  sensevoice: () => import('agentic-voice/sensevoice'),
  whisper:    () => import('agentic-voice/whisper'),
  default:    () => import('agentic-voice/openai-whisper'),
}
```

## 逻辑
1. `init()`: 读 profile.stt.provider，加载对应适配器；失败回退 default
2. `transcribe(audioBuffer)`: 校验非空，调用 `adapter.transcribe(audioBuffer)`

## 边界情况
- `init()` 未调用：抛出 `Error('not initialized')`
- 空 buffer：抛出 `{ code: 'EMPTY_AUDIO' }`
- 适配器动态 import 失败：回退 default

## 测试用例
- init() 后 transcribe 正常返回 string
- 未 init 时 transcribe 抛错
- 空 buffer 抛出 EMPTY_AUDIO
