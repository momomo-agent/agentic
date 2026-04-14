// Real-world eager execution benchmark
// Tests with actual LLM APIs: Anthropic (cloud) + Gemma4 (local Ollama)

const ANTHROPIC_BASE = 'https://node-hk.sssaicode.com/api'
const ANTHROPIC_KEY = 'sk-sssaicode-8cd160634b7826ddb6e489fdfe278cca27ca5bfd2b68b748d58ff95ec1aced2b'
const ANTHROPIC_MODEL = 'claude-opus-4-6'

const OLLAMA_BASE = 'http://127.0.0.1:11434'
const GEMMA_MODEL = 'gemma4:e4b'

const TOOL_DEF = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  input_schema: {
    type: 'object',
    properties: { city: { type: 'string', description: 'City name' } },
    required: ['city']
  }
}

// Simulate a tool that takes some time (like an API call)
const TOOL_LATENCY_MS = 200
function executeTool() {
  return new Promise(r => setTimeout(() => r({ temp: 22, condition: 'sunny' }), TOOL_LATENCY_MS))
}

// ── Anthropic streaming with timing ──
async function anthropicStream(mode) {
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    stream: true,
    tools: [TOOL_DEF],
    system: mode === 'eager'
      ? 'When using tools, call them FIRST before any text. Do not narrate — just call the tool.'
      : 'You are a helpful assistant.',
    messages: [{ role: 'user', content: 'What is the weather in Tokyo? Use the get_weather tool.' }]
  }

  const t0 = performance.now()
  const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let firstTokenMs = null
  let toolReadyMs = null
  let toolStartedMs = null
  let toolDoneMs = null
  let streamDoneMs = null
  let currentTool = null
  let currentToolInput = ''
  let textChunks = 0
  let toolPromise = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]' || !data) continue
      try {
        const event = JSON.parse(data)

        if (event.type === 'content_block_delta') {
          if (event.delta?.type === 'text_delta') {
            if (!firstTokenMs) firstTokenMs = performance.now() - t0
            textChunks++
          } else if (event.delta?.type === 'input_json_delta') {
            currentToolInput += event.delta.partial_json || ''
          }
        } else if (event.type === 'content_block_start') {
          if (event.content_block?.type === 'tool_use') {
            currentTool = event.content_block
            currentToolInput = ''
          } else if (event.content_block?.type === 'text' && !firstTokenMs) {
            // text block started
          }
        } else if (event.type === 'content_block_stop') {
          if (currentTool) {
            toolReadyMs = performance.now() - t0

            if (mode === 'eager') {
              // Start tool immediately
              toolStartedMs = performance.now() - t0
              toolPromise = executeTool()
            }

            currentTool = null
            currentToolInput = ''
          }
        }
      } catch {}
    }
  }

  streamDoneMs = performance.now() - t0

  // Sequential: start tool after stream ends
  if (mode === 'sequential') {
    toolStartedMs = performance.now() - t0
    await executeTool()
    toolDoneMs = performance.now() - t0
  } else {
    // Eager: tool may already be done
    if (toolPromise) await toolPromise
    toolDoneMs = performance.now() - t0
  }

  return {
    firstTokenMs: firstTokenMs?.toFixed(0) || 'N/A',
    toolReadyMs: toolReadyMs?.toFixed(0) || 'N/A',
    streamDoneMs: streamDoneMs?.toFixed(0),
    toolStartedMs: toolStartedMs?.toFixed(0) || 'N/A',
    toolDoneMs: toolDoneMs?.toFixed(0),
    textChunks,
    totalMs: toolDoneMs?.toFixed(0),
  }
}

// ── Ollama (OpenAI-compatible) streaming with timing ──
async function ollamaStream(mode) {
  const body = {
    model: GEMMA_MODEL,
    stream: true,
    tools: [{
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current weather for a city',
        parameters: {
          type: 'object',
          properties: { city: { type: 'string', description: 'City name' } },
          required: ['city']
        }
      }
    }],
    messages: [
      {
        role: 'system',
        content: mode === 'eager'
          ? 'When using tools, call them FIRST before any text. Do not narrate — just call the tool.'
          : 'You are a helpful assistant.'
      },
      { role: 'user', content: 'What is the weather in Tokyo? Use the get_weather tool.' }
    ]
  }

  const t0 = performance.now()
  const res = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama ${res.status}: ${err.slice(0, 200)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let firstTokenMs = null
  let toolReadyMs = null
  let toolStartedMs = null
  let toolDoneMs = null
  let streamDoneMs = null
  let textChunks = 0
  let toolCalls = {}
  let toolPromise = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]' || !data) continue
      try {
        const chunk = JSON.parse(data)
        const delta = chunk.choices?.[0]?.delta
        if (!delta) continue

        if (delta.content) {
          if (!firstTokenMs) firstTokenMs = performance.now() - t0
          textChunks++
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: '', name: '', arguments: '' }
            if (tc.id) toolCalls[tc.index].id = tc.id
            if (tc.function?.name) toolCalls[tc.index].name = tc.function.name
            if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments
          }
        }

        if (chunk.choices?.[0]?.finish_reason) {
          // For OpenAI format, tool is "ready" when finish_reason appears
          if (Object.keys(toolCalls).length > 0 && !toolReadyMs) {
            toolReadyMs = performance.now() - t0
            if (mode === 'eager') {
              toolStartedMs = performance.now() - t0
              toolPromise = executeTool()
            }
          }
        }
      } catch {}
    }
  }

  streamDoneMs = performance.now() - t0

  if (mode === 'sequential') {
    if (Object.keys(toolCalls).length > 0) {
      toolStartedMs = performance.now() - t0
      await executeTool()
      toolDoneMs = performance.now() - t0
    } else {
      toolDoneMs = streamDoneMs
    }
  } else {
    if (toolPromise) await toolPromise
    toolDoneMs = performance.now() - t0
  }

  return {
    firstTokenMs: firstTokenMs?.toFixed(0) || 'N/A',
    toolReadyMs: toolReadyMs?.toFixed(0) || 'N/A',
    streamDoneMs: streamDoneMs?.toFixed(0),
    toolStartedMs: toolStartedMs?.toFixed(0) || 'N/A',
    toolDoneMs: toolDoneMs?.toFixed(0),
    textChunks,
    totalMs: toolDoneMs?.toFixed(0),
    hadToolCall: Object.keys(toolCalls).length > 0,
  }
}

// ── Run benchmarks ──
async function run() {
  console.log('═'.repeat(65))
  console.log('  Real-World Eager Execution Benchmark')
  console.log('  Tool latency: ' + TOOL_LATENCY_MS + 'ms (simulated API call)')
  console.log('═'.repeat(65))

  // Anthropic
  console.log('\n── Anthropic (claude-opus-4-6 via sssaicode) ──\n')
  try {
    const seqResult = await anthropicStream('sequential')
    const eagerResult = await anthropicStream('eager')

    console.log('  Sequential:')
    console.log(`    First token: ${seqResult.firstTokenMs}ms`)
    console.log(`    Tool ready:  ${seqResult.toolReadyMs}ms`)
    console.log(`    Stream done: ${seqResult.streamDoneMs}ms`)
    console.log(`    Tool start:  ${seqResult.toolStartedMs}ms`)
    console.log(`    Total:       ${seqResult.totalMs}ms  (${seqResult.textChunks} text chunks)`)

    console.log('  Eager:')
    console.log(`    First token: ${eagerResult.firstTokenMs}ms`)
    console.log(`    Tool ready:  ${eagerResult.toolReadyMs}ms`)
    console.log(`    Stream done: ${eagerResult.streamDoneMs}ms`)
    console.log(`    Tool start:  ${eagerResult.toolStartedMs}ms`)
    console.log(`    Total:       ${eagerResult.totalMs}ms  (${eagerResult.textChunks} text chunks)`)

    const saved = parseFloat(seqResult.totalMs) - parseFloat(eagerResult.totalMs)
    const pct = (saved / parseFloat(seqResult.totalMs) * 100)
    console.log(`\n  Saved: ${saved.toFixed(0)}ms (${pct.toFixed(1)}%)`)
  } catch (e) {
    console.log('  Error:', e.message)
  }

  // Gemma4 local
  console.log('\n── Gemma4 (local Ollama, ' + GEMMA_MODEL + ') ──\n')
  try {
    const seqResult = await ollamaStream('sequential')
    const eagerResult = await ollamaStream('eager')

    console.log('  Sequential:')
    console.log(`    First token: ${seqResult.firstTokenMs}ms`)
    console.log(`    Tool ready:  ${seqResult.toolReadyMs}ms`)
    console.log(`    Stream done: ${seqResult.streamDoneMs}ms`)
    console.log(`    Tool start:  ${seqResult.toolStartedMs}ms`)
    console.log(`    Total:       ${seqResult.totalMs}ms  (${seqResult.textChunks} text chunks, tool=${seqResult.hadToolCall})`)

    console.log('  Eager:')
    console.log(`    First token: ${eagerResult.firstTokenMs}ms`)
    console.log(`    Tool ready:  ${eagerResult.toolReadyMs}ms`)
    console.log(`    Stream done: ${eagerResult.streamDoneMs}ms`)
    console.log(`    Tool start:  ${eagerResult.toolStartedMs}ms`)
    console.log(`    Total:       ${eagerResult.totalMs}ms  (${eagerResult.textChunks} text chunks, tool=${eagerResult.hadToolCall})`)

    const saved = parseFloat(seqResult.totalMs) - parseFloat(eagerResult.totalMs)
    const pct = (saved / parseFloat(seqResult.totalMs) * 100)
    console.log(`\n  Saved: ${saved.toFixed(0)}ms (${pct.toFixed(1)}%)`)
  } catch (e) {
    console.log('  Error:', e.message)
  }

  console.log('\n' + '═'.repeat(65))
}

run().catch(console.error)
