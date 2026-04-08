# Task Design: Add streaming to agentic-core Provider interface

## Files to Modify

1. `packages/agentic-core/src/types.ts` — add StreamChunk + extend Provider interface
2. `packages/agentic-core/src/providers/anthropic.ts` — implement stream()
3. `packages/agentic-core/src/providers/openai.ts` — implement stream()
4. `packages/agentic-core/src/loop.ts` — add runAgentLoopStream()

## Type Changes — `packages/agentic-core/src/types.ts`

Add after `ProviderResponse`:

```typescript
interface StreamChunk {
  type: 'text_delta' | 'tool_use' | 'message_stop'
  text?: string
  toolCall?: ProviderToolCall
  usage?: { input: number; output: number }
}
```

Add after `AgentLoopResult`:

```typescript
interface AgentStreamChunk {
  type: 'text' | 'tool_start' | 'tool_result' | 'done'
  text?: string
  toolCall?: { tool: string; input: Record<string, unknown> }
  output?: string
  result?: AgentLoopResult
}
```

Extend `Provider` interface:

```typescript
interface Provider {
  chat(messages: ProviderMessage[], tools: ToolDefinition[], system?: string): Promise<ProviderResponse>
  stream(messages: ProviderMessage[], tools: ToolDefinition[], system?: string): AsyncGenerator<StreamChunk>
}
```

## Anthropic stream() — `packages/agentic-core/src/providers/anthropic.ts`

Add `stream()` method to the returned Provider object:

```typescript
async *stream(messages: ProviderMessage[], tools: ToolDefinition[], system?: string): AsyncGenerator<StreamChunk> {
  const body = {
    model,
    max_tokens: 4096,
    stream: true,                    // <-- key difference from chat()
    messages: convertMessages(messages),
    ...(system ? { system } : {}),
    ...(tools.length > 0 ? {
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }))
    } : {}),
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  // Parse SSE stream from response.body
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // Track in-progress tool use blocks: Map<index, {id, name, input_json}>
  const toolUseBlocks: Map<number, {id: string, name: string, inputJson: string}> = new Map()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Process complete SSE lines
    const lines = buffer.split('\n')
    buffer = lines.pop()!  // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (!data.trim()) continue

      try {
        const event = JSON.parse(data)

        // Anthropic SSE event types:
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          yield { type: 'text_delta', text: event.delta.text }
        }
        else if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
          const idx = event.index ?? 0
          toolUseBlocks.set(idx, {
            id: event.content_block.id,
            name: event.content_block.name,
            inputJson: '',
          })
        }
        else if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
          const idx = event.index ?? 0
          const block = toolUseBlocks.get(idx)
          if (block) block.inputJson += event.delta.partial_json
        }
        else if (event.type === 'content_block_stop') {
          const idx = event.index ?? 0
          const block = toolUseBlocks.get(idx)
          if (block) {
            let input = {}
            try { input = JSON.parse(block.inputJson || '{}') } catch { /* malformed json */ }
            yield {
              type: 'tool_use',
              toolCall: { id: block.id, name: block.name, input },
            }
            toolUseBlocks.delete(idx)
          }
        }
        else if (event.type === 'message_delta') {
          // Contains final usage info
          yield {
            type: 'message_stop',
            usage: {
              input: event.usage?.input_tokens ?? 0,
              output: event.usage?.output_tokens ?? 0,
            },
          }
        }
      } catch { /* skip malformed chunks */ }
    }
  }
}
```

## OpenAI stream() — `packages/agentic-core/src/providers/openai.ts`

Add `stream()` method to the returned Provider object:

```typescript
async *stream(messages: ProviderMessage[], tools: ToolDefinition[], system?: string): AsyncGenerator<StreamChunk> {
  const body: Record<string, unknown> = {
    model,
    stream: true,
    messages: convertMessages(messages, system),
  }

  if (tools.length > 0) {
    body.tools = tools.map(t => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }))
  }

  const base = baseUrl.replace(/\/+$/, '')
  const endpoint = base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const toolCalls: Map<number, {id: string, name: string, args: string}> = new Map()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop()!

    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
      try {
        const chunk = JSON.parse(line.slice(6))
        const delta = chunk.choices?.[0]?.delta
        if (!delta) {
          if (chunk.usage) {
            yield { type: 'message_stop', usage: { input: chunk.usage.prompt_tokens ?? 0, output: chunk.usage.completion_tokens ?? 0 } }
          }
          continue
        }

        if (delta.content) {
          yield { type: 'text_delta', text: delta.content }
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0
            const existing = toolCalls.get(idx)
            if (!existing) {
              toolCalls.set(idx, { id: tc.id || '', name: tc.function?.name || '', args: tc.function?.arguments || '' })
            } else {
              if (tc.function?.arguments) existing.args += tc.function.arguments
            }
          }
        }

        const finishReason = chunk.choices?.[0]?.finish_reason
        if (finishReason) {
          // Yield accumulated tool calls
          for (const tc of toolCalls.values()) {
            let input = {}
            try { input = JSON.parse(tc.args || '{}') } catch { /* malformed */ }
            yield { type: 'tool_use', toolCall: { id: tc.id, name: tc.name, input } }
          }
          yield { type: 'message_stop' }
        }
      } catch { /* skip malformed chunks */ }
    }
  }
}
```

## runAgentLoopStream() — `packages/agentic-core/src/loop.ts`

Add after `runAgentLoop()`:

```typescript
export async function* runAgentLoopStream(config: AgentLoopConfig): AsyncGenerator<AgentStreamChunk> {
  const maxRounds = config.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS
  const messages: ProviderMessage[] = [{ role: 'user', content: config.prompt }]
  const allToolCalls: AgentLoopResult['toolCalls'] = []
  let totalInput = 0
  let totalOutput = 0
  let fullText = ''

  for (let round = 0; round < maxRounds; round++) {
    const toolCallsThisRound: ProviderToolCall[] = []

    for await (const chunk of config.provider.stream(messages, config.toolDefs, config.systemPrompt)) {
      if (chunk.type === 'text_delta' && chunk.text) {
        fullText += chunk.text
        yield { type: 'text', text: fullText }
      } else if (chunk.type === 'tool_use' && chunk.toolCall) {
        toolCallsThisRound.push(chunk.toolCall)
      } else if (chunk.type === 'message_stop' && chunk.usage) {
        totalInput += chunk.usage.input
        totalOutput += chunk.usage.output
      }
    }

    if (toolCallsThisRound.length === 0) {
      yield { type: 'done', result: { answer: fullText, toolCalls: allToolCalls, usage: { input: totalInput, output: totalOutput } } }
      return
    }

    // Execute tool calls
    const results: string[] = []
    for (const tc of toolCallsThisRound) {
      yield { type: 'tool_start', toolCall: { tool: tc.name, input: tc.input } }
      const output = await config.executeToolCall(tc)
      results.push(output)
      allToolCalls.push({ tool: tc.name, input: tc.input, output })
      yield { type: 'tool_result', toolCall: { tool: tc.name, input: tc.input }, output }
    }

    // Append messages for next round
    messages.push({ role: 'assistant', content: '', toolCalls: toolCallsThisRound } as unknown as ProviderMessage)
    messages.push({
      role: 'tool',
      content: toolCallsThisRound.map((tc, i) => ({
        type: 'tool_result' as const,
        toolCallId: tc.id,
        content: results[i],
      })),
    } as ProviderMessage)
  }

  throw new Error(`Agent loop exceeded ${maxRounds} rounds`)
}
```

## Edge Cases

- **SSE buffer split**: Lines may be split across `read()` chunks — buffer handles this
- **Empty stream response**: No chunks yielded → loop exits, returns empty answer
- **Tool call without JSON**: `inputJson` may be empty → default to `{}`
- **message_stop without usage**: Anthropic/OpenAI may not include usage → default to `{input:0, output:0}`
- **Provider error mid-stream**: Error propagates up through the generator

## Test Cases

- Mock Anthropic SSE response → verify text_delta chunks yielded
- Mock OpenAI SSE response → verify text_delta chunks yielded
- Mock tool_use SSE → verify tool_use chunk with parsed input
- `runAgentLoopStream()` with mock provider → verify text → tool_start → tool_result → done sequence
- `runAgentLoopStream()` with final text response → verify done with answer

## Dependencies

- None (this is the foundation task; tasks 2-5 depend on it)
