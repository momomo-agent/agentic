import { AgenticError } from './transport.js'

/**
 * ChatEvent types:
 *   { type: 'text_delta', text: string }
 *   { type: 'tool_use', id: string, name: string, input: Record<string, unknown> }
 *   { type: 'done', stopReason: string, usage?: { inputTokens: number, outputTokens: number } }
 *   { type: 'error', error: string }
 */

// ── Provider matching ──────────────────────────────────────

function matchProvider(providers, model) {
  for (const p of providers) {
    if (!p.models) return p
    for (const pattern of p.models) {
      if (globMatch(pattern, model)) return p
    }
  }
  return null
}

function globMatch(pattern, str) {
  const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
  return re.test(str)
}

// ── OpenAI protocol ────────────────────────────────────────

function buildOpenAIBody(messages, options) {
  const body = {
    model: options.model,
    messages,
    stream: options.stream ?? false,
  }
  if (options.maxTokens != null) body.max_tokens = options.maxTokens
  if (options.temperature != null) body.temperature = options.temperature
  if (options.tools?.length) {
    body.tools = options.tools
    if (options.toolChoice) body.tool_choice = options.toolChoice
  }
  return body
}

async function* streamOpenAI(baseUrl, apiKey, messages, options) {
  const body = buildOpenAIBody(messages, { ...options, stream: true })
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  let res
  try {
    res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST', headers, body: JSON.stringify(body),
    })
  } catch (err) {
    yield { type: 'error', error: err.message }
    return
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    yield { type: 'error', error: `HTTP ${res.status}: ${text}` }
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const toolCallAccum = {}  // index -> { id, name, arguments }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') {
        // Flush accumulated tool calls
        for (const tc of Object.values(toolCallAccum)) {
          let input = {}
          try { input = JSON.parse(tc.arguments) } catch {}
          yield { type: 'tool_use', id: tc.id, name: tc.name, input }
        }
        yield { type: 'done', stopReason: 'end_turn' }
        return
      }
      let parsed
      try { parsed = JSON.parse(data) } catch { continue }

      if (parsed.error) {
        yield { type: 'error', error: parsed.error.message || JSON.stringify(parsed.error) }
        continue
      }

      const choice = parsed.choices?.[0]
      if (!choice) continue
      const delta = choice.delta || {}

      if (delta.content) {
        yield { type: 'text_delta', text: delta.content }
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!toolCallAccum[idx]) {
            toolCallAccum[idx] = { id: tc.id || '', name: tc.function?.name || '', arguments: '' }
          }
          if (tc.id) toolCallAccum[idx].id = tc.id
          if (tc.function?.name) toolCallAccum[idx].name = tc.function.name
          if (tc.function?.arguments) toolCallAccum[idx].arguments += tc.function.arguments
        }
      }

      if (choice.finish_reason) {
        const reason = choice.finish_reason === 'tool_calls' ? 'tool_use' : choice.finish_reason === 'stop' ? 'end_turn' : choice.finish_reason
        // Flush accumulated tool calls before done
        for (const tc of Object.values(toolCallAccum)) {
          let input = {}
          try { input = JSON.parse(tc.arguments) } catch {}
          yield { type: 'tool_use', id: tc.id, name: tc.name, input }
        }
        const usage = parsed.usage ? { inputTokens: parsed.usage.prompt_tokens, outputTokens: parsed.usage.completion_tokens } : undefined
        yield { type: 'done', stopReason: reason, ...(usage && { usage }) }
        return
      }
    }
  }
  // Stream ended without [DONE] or finish_reason
  yield { type: 'done', stopReason: 'end_turn' }
}

async function chatOpenAINonStream(baseUrl, apiKey, messages, options) {
  const body = buildOpenAIBody(messages, { ...options, stream: false })
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST', headers, body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new AgenticError(res.status, text)
  }
  const data = await res.json()
  const choice = data.choices?.[0]
  const msg = choice?.message || {}
  const result = { answer: msg.content || '' }
  if (msg.tool_calls?.length) {
    result.toolCalls = msg.tool_calls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || '{}'),
    }))
  }
  return result
}

// ── Anthropic protocol ─────────────────────────────────────

function convertMessagesToAnthropic(messages) {
  let system = undefined
  const msgs = []
  for (const m of messages) {
    if (m.role === 'system') {
      system = system ? system + '\n' + m.content : m.content
    } else if (m.role === 'tool') {
      // Convert tool result to Anthropic format
      msgs.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: m.tool_call_id,
          content: m.content,
        }],
      })
    } else {
      msgs.push({ role: m.role, content: m.content })
    }
  }
  return { system, messages: msgs }
}

function convertToolsToAnthropic(tools) {
  if (!tools?.length) return undefined
  return tools.map(t => {
    const fn = t.type === 'function' ? t.function : t
    return {
      name: fn.name,
      description: fn.description || '',
      input_schema: fn.parameters || { type: 'object', properties: {} },
    }
  })
}

function buildAnthropicBody(messages, options) {
  const { system, messages: msgs } = convertMessagesToAnthropic(messages)
  const body = {
    model: options.model,
    messages: msgs,
    max_tokens: options.maxTokens || 4096,
    stream: options.stream ?? false,
  }
  if (system) body.system = system
  if (options.temperature != null) body.temperature = options.temperature
  const tools = convertToolsToAnthropic(options.tools)
  if (tools) body.tools = tools
  if (options.toolChoice) {
    const tc = options.toolChoice
    body.tool_choice = tc === 'auto' ? { type: 'auto' } : tc === 'none' ? { type: 'none' } : { type: 'any' }
  }
  return body
}

async function* streamAnthropic(baseUrl, apiKey, messages, options) {
  const body = buildAnthropicBody(messages, { ...options, stream: true })
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }

  let res
  try {
    res = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST', headers, body: JSON.stringify(body),
    })
  } catch (err) {
    yield { type: 'error', error: err.message }
    return
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    yield { type: 'error', error: `HTTP ${res.status}: ${text}` }
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let usage = undefined
  // Track current content blocks for tool_use accumulation
  const blocks = {}  // index -> { type, id, name, inputJson }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      let parsed
      try { parsed = JSON.parse(line.slice(6)) } catch { continue }

      switch (parsed.type) {
        case 'message_start':
          if (parsed.message?.usage) {
            usage = { inputTokens: parsed.message.usage.input_tokens, outputTokens: 0 }
          }
          break

        case 'content_block_start': {
          const idx = parsed.index ?? 0
          const block = parsed.content_block || {}
          if (block.type === 'tool_use') {
            blocks[idx] = { type: 'tool_use', id: block.id || '', name: block.name || '', inputJson: '' }
          } else {
            blocks[idx] = { type: 'text' }
          }
          break
        }

        case 'content_block_delta': {
          const idx = parsed.index ?? 0
          const delta = parsed.delta || {}
          if (delta.type === 'text_delta') {
            yield { type: 'text_delta', text: delta.text }
          } else if (delta.type === 'input_json_delta') {
            if (blocks[idx]) blocks[idx].inputJson += delta.partial_json || ''
          }
          break
        }

        case 'content_block_stop': {
          const idx = parsed.index ?? 0
          const block = blocks[idx]
          if (block?.type === 'tool_use') {
            let input = {}
            try { input = JSON.parse(block.inputJson) } catch {}
            yield { type: 'tool_use', id: block.id, name: block.name, input }
          }
          delete blocks[idx]
          break
        }

        case 'message_delta': {
          const delta = parsed.delta || {}
          if (parsed.usage?.output_tokens && usage) {
            usage.outputTokens = parsed.usage.output_tokens
          }
          const stopReason = delta.stop_reason || 'end_turn'
          yield { type: 'done', stopReason, ...(usage && { usage }) }
          return
        }

        case 'message_stop':
          // Already handled by message_delta
          break

        case 'error':
          yield { type: 'error', error: parsed.error?.message || JSON.stringify(parsed.error) }
          return
      }
    }
  }
  // Stream ended without message_delta
  yield { type: 'done', stopReason: 'end_turn', ...(usage && { usage }) }
}

async function chatAnthropicNonStream(baseUrl, apiKey, messages, options) {
  const body = buildAnthropicBody(messages, { ...options, stream: false })
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST', headers, body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new AgenticError(res.status, text)
  }
  const data = await res.json()
  const result = { answer: '' }
  const toolCalls = []
  for (const block of data.content || []) {
    if (block.type === 'text') result.answer += block.text
    if (block.type === 'tool_use') {
      toolCalls.push({ id: block.id, name: block.name, args: block.input || {} })
    }
  }
  if (toolCalls.length) result.toolCalls = toolCalls
  return result
}

// ── Public API ─────────────────────────────────────────────

export function chat(providers, messages, options = {}) {
  const model = options.model
  const provider = model ? matchProvider(providers, model) : null

  if (!provider) {
    throw new AgenticError(400, `No provider matched for model "${model}"`)
  }

  if (options.stream) {
    const gen = provider.type === 'anthropic'
      ? streamAnthropic(provider.baseUrl, provider.apiKey, messages, options)
      : streamOpenAI(provider.baseUrl, provider.apiKey, messages, options)
    return makeAsyncIterablePromise(gen)
  }

  return provider.type === 'anthropic'
    ? chatAnthropicNonStream(provider.baseUrl, provider.apiKey, messages, options)
    : chatOpenAINonStream(provider.baseUrl, provider.apiKey, messages, options)
}

function makeAsyncIterablePromise(asyncGen) {
  return {
    [Symbol.asyncIterator]() { return asyncGen },
    then(resolve, reject) { return Promise.resolve(asyncGen).then(resolve, reject) },
  }
}
