# 快速开始

## 安装

```bash
git clone https://github.com/momomo-agent/agentic.git
cd agentic
pnpm install
```

## 在你的项目里引用

```bash
git submodule add https://github.com/momomo-agent/agentic.git lib/agentic
```

```json
{
  "dependencies": {
    "agentic": "file:./lib/agentic/packages/agentic"
  }
}
```

## Hello Agent

```js
import { Agentic } from 'agentic'

const ai = new Agentic({ provider: 'anthropic', apiKey: 'sk-...' })
const reply = await ai.think('你好，介绍一下自己')
console.log(reply)
```

## 组合器官

所有能力通过同一个 `Agentic` 实例访问，子库按需 lazy load：

```js
import { Agentic } from 'agentic'

const ai = new Agentic({
  provider: 'anthropic',
  apiKey: 'sk-...',
})

// 记住对话
await ai.remember('用户喜欢简洁的回答')

// 带记忆的对话
const context = await ai.recall('用户偏好')
const reply = await ai.think('你好', { context })

// 语音播报
await ai.speak(reply)
```

## 连接 agentic-service

本地跑 agentic-service 后，可以用 OpenAI-compatible API 统一访问：

```js
const ai = new Agentic({
  provider: 'openai',
  baseUrl: 'http://localhost:1234',
  serviceUrl: 'http://localhost:1234',  // voice fallback + admin
})
```

## 检查可用能力

```js
const caps = ai.capabilities()
// { think: true, speak: false, remember: true, ... }
```

没装的子库对应的能力会返回 `false`，调用时会抛出明确的错误提示。

## 所有 API

| 方法 | 器官 | 说明 |
|------|------|------|
| `ai.think(input)` | core | LLM 对话 |
| `ai.speak(text)` | voice | 文字转语音 |
| `ai.listen(audio)` | voice | 语音转文字 |
| `ai.converse(audio)` | core + voice | 语音对话（听→想→说） |
| `ai.remember(text)` | memory | 存入记忆 |
| `ai.recall(query)` | memory | 检索记忆 |
| `ai.save(key, value)` | store | 持久化存储 |
| `ai.load(key)` | store | 读取存储 |
| `ai.embed(text)` | embed | 文本向量化 |
| `ai.perceive(frame)` | sense | 视觉感知 |
| `ai.decide(input)` | act | 决策 |
| `ai.act(input)` | act | 执行动作 |
| `ai.render(markdown)` | render | 渲染 Markdown |
| `ai.readFile(path)` | filesystem | 读文件 |
| `ai.run(command)` | shell | 执行命令 |
