# Task Design: STT/TTS 硬件自适应选择

## Files
- `src/runtime/stt.js` — 修改，按 profile 选择适配器
- `src/runtime/tts.js` — 修改，按 profile 选择适配器

## stt.js

```js
// 模块初始化时选择适配器
import { getProfile } from '../detector/profiles.js'

const ADAPTERS = {
  sensevoice: () => import('agentic-voice/sensevoice'),
  whisper:    () => import('agentic-voice/whisper'),
  default:    () => import('agentic-voice/openai-whisper'),
}

let adapter = null

async function init() {
  const profile = await getProfile()
  const load = ADAPTERS[profile.stt.provider] ?? ADAPTERS.default
  adapter = await load()
}

// 公开接口
async function transcribe(audioBuffer: Buffer) → Promise<string>
// → adapter.transcribe(audioBuffer)
```

## tts.js

```js
const ADAPTERS = {
  kokoro:     () => import('agentic-voice/kokoro'),
  piper:      () => import('agentic-voice/piper'),
  default:    () => import('agentic-voice/openai-tts'),
}

let adapter = null

async function init() {
  const profile = await getProfile()
  const load = ADAPTERS[profile.tts.provider] ?? ADAPTERS.default
  adapter = await load()
}

async function synthesize(text: string) → Promise<Buffer>
// → adapter.synthesize(text)
```

## 逻辑
1. server/api.js 启动时调用 stt.init() 和 tts.init()
2. init() 读取 profile，动态 import 对应适配器模块
3. transcribe() / synthesize() 直接委托给已选适配器
4. 适配器未知 → fallback 到 default（openai）

## 边界情况
- profile 加载失败 → 使用 default 适配器，不抛出
- 适配器 import 失败 → throw Error，api.js 返回 500
- adapter 未初始化时调用 transcribe/synthesize → throw Error('not initialized')

## 依赖
- detector/profiles.js（getProfile）
- agentic-voice（各适配器子路径）

## 测试用例
- profile.stt.provider === 'sensevoice' → SenseVoice 适配器被调用
- profile.stt.provider === 'whisper' → Whisper 适配器被调用
- profile.stt.provider 未知 → OpenAI Whisper 适配器被调用
- profile.tts.provider === 'kokoro' → Kokoro 适配器被调用
- profile.tts.provider 未知 → OpenAI TTS 适配器被调用
