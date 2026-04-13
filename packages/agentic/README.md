# agentic

> 给 AI 造身体 — 一次 import，所有能力

```js
import { Agentic } from 'agentic'

const ai = new Agentic({
  provider: 'ollama',
  model: 'gemma3',
  tts: { provider: 'openai', apiKey: 'sk-...' },
  stt: { provider: 'openai', apiKey: 'sk-...' },
})
```

## 能力一览

| 能力 | 方法 | 子库 |
|------|------|------|
| 思考 | `ai.think(input, opts?)` | agentic-core |
| 说 | `ai.speak(text)` / `ai.speakAloud(text)` / `ai.speakStream(stream)` | agentic-voice |
| 听 | `ai.listen(audio)` / `ai.startListening(cb)` | agentic-voice |
| 看 | `ai.see(image, prompt?)` | agentic-core |
| 对话 | `ai.converse(audio)` | core + voice |
| 记忆 | `ai.remember(text)` / `ai.recall(query)` | agentic-memory |
| 存储 | `ai.save(k, v)` / `ai.load(k)` / `ai.query(sql)` | agentic-store |
| 向量 | `ai.embed(text)` / `ai.index(id, text)` / `ai.search(query)` | agentic-embed |
| 感知 | `ai.perceive(frame)` | agentic-sense |
| 行动 | `ai.decide(input)` / `ai.act(input)` / `ai.registerAction(a)` | agentic-act |
| 渲染 | `ai.render(md)` / `ai.createRenderer(el)` | agentic-render |
| 文件 | `ai.readFile(p)` / `ai.writeFile(p, c)` / `ai.grep(pat)` | agentic-filesystem |
| 命令 | `ai.run(cmd)` | agentic-shell |
| 空间 | `ai.reconstructSpace(imgs)` | agentic-spatial |

## 两种后端

| | Agentic | AgenticClient |
|---|---------|---------------|
| 后端 | 本地子库 | 远程 service |
| 接口 | think/listen/speak/see/converse/... | 同左 |
| 依赖 | 子库（按需装） | 零依赖 |
| 场景 | Node/Electron | 浏览器/跨网络 |

```js
// 本地
const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })

// 远程
const ai = new AgenticClient('http://localhost:1234')

// 同一套接口
await ai.think('hello')
await ai.speak('hello')
await ai.listen(audio)
```
