// Anthropic provider — Claude API with tool use

import type { ProviderConfig } from '../types.js'
import type { Provider, ProviderMessage, ProviderResponse, StreamChunk, ToolDefinition } from '../types.js'

export function createAnthropicProvider(config: ProviderConfig): Provider {
  if (!config.apiKey) throw new Error('apiKey is required for anthropic provider')
  const base = (config.baseUrl ?? 'https://api.anthropic.com').replace(/\/+$/, '')
  const endpoint = base.endsWith('/v1') ? `${base}/messages` : `${base}/v1/messages`
  const model = config.model ?? 'claude-sonnet-4-20250514'

  return {
    async chat(messages: ProviderMessage[], tools: ToolDefinition[], system?: string): Promise<ProviderResponse> {
      const body: Record<string, unknown> = {
        model,
        max_tokens: 4096,
        messages: convertMessages(messages),
      }

      if (system) body.system = system

      if (tools.length > 0) {
        body.tools = tools.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        }))
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

      const data = await res.json() as AnthropicResponse
      return parseResponse(data)
    },

    async *stream(messages: ProviderMessage[], tools: ToolDefinition[], system?: string): AsyncGenerator<StreamChunk> {
      const body: Record<string, unknown> = {
        model,
        max_tokens: 4096,
        stream: true,
        messages: convertMessages(messages),
      }

      if (system) body.system = system

      if (tools.length > 0) {
        body.tools = tools.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        }))
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

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const toolUseBlocks: Map<number, { id: string; name: string; inputJson: string }> = new Map()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop()!

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (!data.trim()) continue

          try {
            const event = JSON.parse(data)

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
  }
}

// --- Anthropic response types ---

interface AnthropicContentBlock {
  type: 'text' | 'tool_use'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
}

interface AnthropicResponse {
  content: AnthropicContentBlock[]
  stop_reason: string
  usage: { input_tokens: number; output_tokens: number }
}

function convertMessages(messages: ProviderMessage[]) {
  return messages.map(m => {
    if (m.role === 'tool' && Array.isArray(m.content)) {
      return {
        role: 'user',
        content: m.content.map(c => ({
          type: 'tool_result',
          tool_use_id: (c as { toolCallId: string }).toolCallId,
          content: (c as { content: string }).content,
        })),
      }
    }
    return { role: m.role, content: m.content }
  })
}

function parseResponse(data: AnthropicResponse): ProviderResponse {
  let text = ''
  const toolCalls: ProviderResponse['toolCalls'] = []

  for (const block of data.content) {
    if (block.type === 'text' && block.text) {
      text += block.text
    } else if (block.type === 'tool_use' && block.id && block.name) {
      toolCalls.push({ id: block.id, name: block.name, input: block.input ?? {} })
    }
  }

  return {
    text,
    toolCalls,
    usage: { input: data.usage.input_tokens, output: data.usage.output_tokens },
    stopReason: data.stop_reason === 'tool_use' ? 'tool_use' : 'end',
    rawContent: data.content,
  }
}
