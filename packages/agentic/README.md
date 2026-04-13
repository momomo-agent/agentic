# agentic

> 给 AI 造身体 — 一次 import，所有能力

同一套接口，两种后端：
- `Agentic` — 本地直接调子库
- `AgenticClient` — 远程连 service

```js
import { Agentic } from 'agentic'

const ai = new Agentic({
  provider: 'ollama',
  model: 'gemma3',
  tts: { provider: 'openai', apiKey: 'sk-...' },
  stt: { provider: 'openai', apiKey: 'sk-...' },
})

// 思考
const result = await ai.think('hello')

// 听
const text = await ai.listen(audioBlob)

// 说
const audio = await ai.speak('hello world')

// 看
const desc = await ai.see(imageBlob, '这是什么？')

// 全链路语音对话
const { text, audio, transcript } = await ai.converse(audioBlob)

// 子库直接访问
ai.memory.learn('something')
ai.store.kvSet('key', 'value')
ai.sense.detect(frame)

// 能力检测
ai.capabilities()
// { think: true, listen: true, speak: true, see: true, converse: true, memory: false, ... }
```

## 对比

| | Agentic | AgenticClient |
|---|---------|---------------|
| 后端 | 本地子库 | 远程 service |
| 接口 | think/listen/speak/see/converse | 同左 |
| 依赖 | 子库（按需装） | 零依赖 |
| 场景 | Node/Electron | 浏览器/跨网络 |
