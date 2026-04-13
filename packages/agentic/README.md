# agentic

> 给 AI 造身体 — 一次 import，所有能力

```js
import { ask, createMemory, createStore, createTTS } from 'agentic'

// 思考
const answer = await ask('hello', { provider: 'ollama', model: 'gemma3' })

// 记忆
const mem = createMemory({ maxTokens: 4000 })
await mem.user('remember this')

// 存储
const store = createStore({ backend: 'sqlite' })
await store.kvSet('key', 'value')

// 语音
const tts = createTTS({ provider: 'openai', apiKey: 'sk-...' })
await tts.speak('hello world')

// 完整 agent
const agent = createAgent({ apiKey: 'sk-...', knowledge: true })
await agent.chat('hello')
```

## 子库

每个子库独立可用，也可以通过 `agentic` 统一导入：

| 子库 | 能力 | 独立用 |
|------|------|--------|
| agentic-core | LLM 调用 | `ask()` |
| agentic-memory | 短期+长期记忆 | `createMemory()` |
| agentic-store | SQLite 持久化 | `createStore()` |
| agentic-voice | TTS + STT | `createTTS()` / `createSTT()` |
| agentic-sense | MediaPipe 感知 | `createSense()` |
| agentic-act | 意图→决策→执行 | `createAct()` |
| agentic-render | Markdown 渲染 | `render()` |
| agentic-embed | 向量化 | `createIndex()` |
| agentic-filesystem | 虚拟文件系统 | `createFileSystem()` |
| agentic-shell | 命令执行 | `createShell()` |
| agentic-spatial | 空间推理 | `reconstructSpace()` |

## 能力检测

```js
import { capabilities } from 'agentic'
console.log(capabilities())
// { core: true, memory: true, store: true, voice: false, ... }
```

只有安装了的子库才可用，缺失的返回 `null`。
