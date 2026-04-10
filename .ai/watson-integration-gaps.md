# Watson 集成缺口分析

Watson（AI 桌面工作台）正在集成 agentic 家族作为统一后端。以下是当前 AgenticClient + AgenticService 无法满足 Watson 需求的缺口。

## 背景：Watson 的 Chat 流程需要什么

Watson 的 Agent 类通过 provider 发起对话，需要：

1. **结构化 streaming 事件** — 区分 text delta / tool_use / tool_result / stop_reason
2. **Tool calling** — 发送 tool 定义，接收 tool_use block（name + input JSON），返回 tool_result
3. **多轮 tool loop** — agent 自动循环：LLM 回复 → 解析 tool_use → 执行 tool → 发 tool_result → 继续，直到 stop_reason=end_turn
4. **System prompt + 多消息历史** — 完整的 messages 数组（system/user/assistant/tool）
5. **多 provider 支持** — Anthropic Messages API（原生）+ OpenAI 兼容（本地模型/第三方）

### Watson 当前的 Provider 接口

```typescript
interface StreamEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'done'
  text?: string           // type=text 时的 delta
  toolName?: string       // type=tool_use
  toolInput?: any         // type=tool_use
  toolUseId?: string      // type=tool_use
  stopReason?: string     // type=done
}

// Provider.chat() 返回 AsyncGenerator<StreamEvent>
```

Watson 有 8 个工具（web_search, read_file, write_file, run_command, screen_capture, screen_action, list_files, delegate），工具定义以 Anthropic 格式传入。

---

## 缺口 1：AgenticClient.chat() 缺少结构化 streaming

**现状：**
- `chat({ stream: true })` 返回 `AsyncGenerator<string>` — 只有纯文本 token
- 内部解析 OpenAI SSE `data: {...}` 但只提取 `delta.content`，丢弃了所有结构信息

**Watson 需要：**
- `AsyncGenerator<ChatEvent>` 其中 ChatEvent 区分：
  - `{ type: 'text_delta', text: string }`
  - `{ type: 'tool_use', id: string, name: string, input: object }`
  - `{ type: 'done', stopReason: 'end_turn' | 'tool_use' | 'max_tokens' }`
  - `{ type: 'error', error: string }`

**建议改法：**
```typescript
// 新增 ChatEvent 类型
type ChatEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'done'; stopReason: string }
  | { type: 'error'; error: string }

// chat() 的 stream 模式返回 AsyncGenerator<ChatEvent>
async *chat(options: ChatOptions & { stream: true }): AsyncGenerator<ChatEvent>
```

在 `_streamChat()` 里，解析 SSE 时保留完整的 `choice.delta` 结构，而不是只取 `.content`。

---

## 缺口 2：AgenticClient.chat() 不支持 tool 定义和 tool_result

**现状：**
- `ChatOptions` 只有 `{ messages, model, stream, maxTokens, temperature }`
- 没有 `tools` 参数
- 没有 `tool_choice` 参数
- 不支持发送 `role: 'tool'` 的消息（tool_result）

**Watson 需要：**
```typescript
interface ChatOptions {
  messages: Message[]
  model?: string
  stream?: boolean
  maxTokens?: number
  temperature?: number
  tools?: ToolDefinition[]      // ← 新增
  toolChoice?: 'auto' | 'none'  // ← 新增
}

// Message 类型需要支持 tool role
type Message =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | { role: 'tool'; content: string; tool_call_id: string }  // ← 新增
```

**建议改法：**
在 `_buildRequestBody()` 里把 `tools` 和 `tool_choice` 透传到 OpenAI 兼容 API 的请求体。

---

## 缺口 3：AgenticService 的 /v1/chat/completions 只代理到 Ollama

**现状：**
- AgenticService 收到 chat 请求后直接转发给 `http://localhost:11434`（Ollama）
- 只支持本地模型

**Watson 需要：**
- 支持多 provider 路由：
  - Anthropic Messages API（Claude 系列）→ 需要 API key + 协议转换
  - OpenAI 兼容（本地 Ollama/MLX + 远程 OpenRouter/Groq）→ 当前已有
- 根据 model 名称自动路由到正确的 provider
- 或者：Watson 直接用 AgenticClient 调不同 provider，AgenticService 只管本地模型

**建议方案：**
AgenticService 保持只管本地模型（Ollama/MLX），AgenticClient 新增直连云端 provider 的能力：

```typescript
const client = new AgenticClient({
  serviceUrl: 'http://127.0.0.1:11435',  // 本地模型
  providers: [
    { type: 'anthropic', apiKey: '...', models: ['claude-*'] },
    { type: 'openai', baseUrl: 'https://openrouter.ai/api/v1', apiKey: '...', models: ['*'] }
  ]
})

// chat() 根据 model 自动选 provider
// claude-* → Anthropic Messages API
// 其他 → 先查 serviceUrl 有没有，没有就查 providers
```

---

## 缺口 4：AgenticClient 缺少 Anthropic Messages API 协议

**现状：**
- 只实现了 OpenAI Chat Completions 协议（`/v1/chat/completions`）
- Anthropic 的 Messages API 格式不同（`/v1/messages`，content blocks，tool_use blocks）

**Watson 需要：**
- Watson 当前 80% 的对话走 Anthropic（Claude Sonnet/Opus）
- Anthropic 的 streaming 格式是 `message_start / content_block_start / content_block_delta / message_delta`，跟 OpenAI 完全不同

**建议改法：**
AgenticClient 内部实现两套协议适配器：

```
AgenticClient.chat()
  ├── model matches claude-* → AnthropicAdapter
  │   ├── 转换 messages 格式（OpenAI → Anthropic）
  │   ├── POST /v1/messages
  │   └── 解析 Anthropic SSE → ChatEvent
  └── 其他 → OpenAIAdapter（现有逻辑）
      ├── POST /v1/chat/completions
      └── 解析 OpenAI SSE → ChatEvent
```

---

## 优先级排序

| # | 缺口 | 影响 | 建议优先级 |
|---|------|------|-----------|
| 1 | 结构化 streaming 事件 | Watson 无法区分 text/tool_use，chat 流程无法工作 | P0 |
| 2 | Tool 定义和 tool_result | Watson 的 8 个工具全部无法使用 | P0 |
| 3 | Anthropic Messages API | Watson 主力模型（Claude）无法调用 | P0 |
| 4 | 多 provider 路由 | 只能用本地模型，无法用云端 | P1 |

缺口 1-3 是 Watson 集成的硬性前提，缺一不可。

---

## Watson 侧已完成的准备

- `src/main/infrastructure/agentic-service.ts` — 内嵌 AgenticService 子进程管理（启动/停止/健康检查）
- `src/main/infrastructure/agentic-client.ts` — AgenticClient 实例管理
- `package.json` 已 link `agentic-client` 包
- Build 通过，AgenticService 在 app ready 时自动启动

一旦上述缺口补齐，Watson 的 `Agent.chat()` 就可以从自写 provider 切换到 `AgenticClient.chat()`。
