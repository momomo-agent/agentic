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
    "agentic-core": "file:./lib/agentic/packages/core"
  }
}
```

## Hello Agent

```js
import { AgenticCore } from 'agentic-core'

const agent = new AgenticCore({ provider: 'anthropic' })
const reply = await agent.chat('你好，介绍一下自己')
console.log(reply)
```

## 组合器官

```js
import { AgenticCore } from 'agentic-core'
import { AgenticVoice } from 'agentic-voice'
import { AgenticMemory } from 'agentic-memory'

const core = new AgenticCore({ provider: 'anthropic' })
const voice = new AgenticVoice()
const memory = new AgenticMemory()

// 记住对话
await memory.remember('用户喜欢简洁的回答')

// 带记忆的对话
const context = await memory.recall('用户偏好')
const reply = await core.chat('你好', { context })

// 语音播报
await voice.speak(reply)
```
