# Agentic — 架构设计

## 核心

Agentic = 子库的胶水。不碰 HTTP，不碰传输。每个子库自己管自己的通信。

```js
const ai = new Agentic({
  provider: 'ollama',
  model: 'gemma3',
  baseUrl: 'http://localhost:11434',
})

ai.think()  → agentic-core（core 内部发 HTTP）
ai.speak()  → agentic-voice（voice 内部发 HTTP）
ai.listen() → agentic-voice
ai.see()    → agentic-core + images
ai.embed()  → agentic-embed（embed 内部发 HTTP 或本地计算）
ai.remember() → agentic-memory（纯本地）
ai.save()   → agentic-store（纯本地）
ai.perceive() → agentic-sense（纯本地）
ai.render() → agentic-render（纯本地）
```

## 构造函数

```js
// 连 Ollama
const ai = new Agentic({ provider: 'ollama', model: 'gemma3' })

// 连 OpenAI
const ai = new Agentic({ apiKey: 'sk-...', model: 'gpt-4o' })

// 连 service
const ai = new Agentic({ baseUrl: 'http://localhost:1234', model: 'gemma3' })

// 全配置
const ai = new Agentic({
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'gemma3',
  system: 'You are helpful.',
  tts: { provider: 'openai', apiKey: 'sk-...' },
  stt: { provider: 'openai', apiKey: 'sk-...' },
  memory: { maxTokens: 8000, knowledge: true },
  store: { path: './data.db' },
})
```

配置透传给子库。Agentic 不解释这些参数，只传递。

## 能力方法 → 子库映射

| 方法 | 子库 | 子库内部 |
|------|------|---------|
| think | agentic-core | agenticAsk() |
| speak | agentic-voice | createTTS().fetchAudio() |
| speakAloud | agentic-voice | createTTS().speak() |
| speakStream | agentic-voice | createTTS().speakStream() |
| listen | agentic-voice | createSTT().transcribe() |
| startListening | agentic-voice | createSTT().startListening() |
| see | agentic-core | agenticAsk() + images |
| converse | voice + core | listen → think → speak |
| remember | agentic-memory | createMemory().learn() |
| recall | agentic-memory | createMemory().recall() |
| addMessage | agentic-memory | createMemory().add() |
| save/load | agentic-store | createStore().kvSet/kvGet() |
| query/exec | agentic-store | createStore().all/exec() |
| embed | agentic-embed | localEmbed() |
| index/search | agentic-embed | create().add/search() |
| perceive | agentic-sense | AgenticSense().detect() |
| decide/act | agentic-act | AgenticAct().decide/run() |
| registerAction | agentic-act | AgenticAct().register() |
| render | agentic-render | render() |
| createRenderer | agentic-render | create() |
| readFile/writeFile | agentic-filesystem | AgenticFileSystem().read/write() |
| ls/tree/grep | agentic-filesystem | AgenticFileSystem() |
| run | agentic-shell | AgenticShell().exec() |
| reconstructSpace | agentic-spatial | reconstructSpace() |

## 子库全部 optional

```json
{
  "peerDependencies": { "agentic-core": "*", "agentic-memory": "*" },
  "peerDependenciesMeta": {
    "agentic-core": { "optional": true },
    "agentic-memory": { "optional": true },
    "...": { "optional": true }
  }
}
```

装了就有，没装 capabilities() 返回 false，调用时抛明确错误。

## 与 service 的关系

```
Agentic（子库胶水）
  └── agentic-core（内部 HTTP）
        └── Ollama / OpenAI / Anthropic / agentic-service
```

service 是 agentic-core 可以连的一个后端，不是 Agentic 直连的。
Agentic 不知道 service 的存在。
