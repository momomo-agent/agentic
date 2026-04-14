// Controlled benchmark: same prompt, only vary execution strategy
// Tests: sequential (wait for LLM done → execute) vs eager (execute during stream)

const ANTHROPIC_BASE = 'https://node-hk.sssaicode.com/api'
const ANTHROPIC_KEY = 'sk-sssaicode-8cd160634b7826ddb6e489fdfe278cca27ca5bfd2b68b748d58ff95ec1aced2b'
const ANTHROPIC_MODEL = 'claude-opus-4-6'

const OLLAMA_BASE = 'http://127.0.0.1:11434'
const GEMMA_MODEL = 'gemma4:e4b'

// Same prompt for ALL runs
const SYSTEM_PROMPT = 'When using tools, call them FIRST before any text explanation. Do not narrate what you are about to do — just call the tool, then explain after you have the result.'
const USER_PROMPT = 'What is the weather in Tokyo and Beijing? Use the get_weather tool for each city.'

const TOOL_LATENCY_MS = 300 // realistic API call

function executeTool() {
  return new Promise(r => setTimeout(() => r({ temp: 22, condition: 'sunny' }), TOOL_LATENCY_MS))
}

// ── Anthropic ──
async function anthropicRun(mode) {
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    stream: true,
    tools: [{
      name: 'get_weather',
      description: 'Get current weather for a city',
      input_schema: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city']
      }
    }],
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: USER_PROMPT }]
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

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentTool = null
  let currentToolInput = ''
  let toolsReady = []
  let eagerPromises = []
  let textLen = 0

  const timeline = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue
      try {
        const event = JSON.parse(data)
        if (event.type === 'content_block_delta') {
          if (event.delta?.type === 'text_delta') textLen += event.delta.text.length
          if (event.delta?.type === 'input_json_delta') currentToolInput += event.delta.partial_json || ''
        } else if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
          currentTool = event.content_block
          currentToolInput = ''
        } else if (event.type === 'content_block_stop' && currentTool) {
          const readyAt = performance.now() - t0
          toolsReady.push({ name: currentTool.name, readyAt })
          timeline.push(`  tool "${currentTool.name}" ready at ${readyAt.toFixed(0)}ms`)

          if (mode === 'eager') {
            eagerPromises.push(executeTool())
            timeline.push(`  tool "${currentTool.name}" STARTED at ${readyAt.toFixed(0)}ms (eager)`)
          }
          currentTool = null
        }
      } catch {}
    }
  }

  const streamDone = performance.now() - t0
  timeline.push(`  stream done at ${streamDone.toFixed(0)}ms (${textLen} chars text)`)

  if (mode === 'sequential') {
    const toolStart = performance.now() - t0
    timeline.push(`  tools START at ${toolStart.toFixed(0)}ms (sequential)`)
    await Promise.all(toolsReady.map(() => executeTool()))
  } else {
    await Promise.all(eagerPromises)
  }

  const total = performance.now() - t0
  timeline.push(`  ALL DONE at ${total.toFixed(0)}ms`)

  return { total, streamDone, toolsReady, textLen, timeline }
}

// ── Ollama/Gemma4 ──
async function ollamaRun(mode) {
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
          properties: { city: { type: 'string' } },
          required: ['city']
        }
      }
    }],
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT }
    ]
  }

  const t0 = performance.now()
  const res = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let toolCalls = {}
  let textLen = 0
  let toolReadyAt = null
  let eagerPromise = null

  const timeline = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue
      try {
        const chunk = JSON.parse(data)
        const delta = chunk.choices?.[0]?.delta
        if (delta?.content) textLen += delta.content.length
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCalls[tc.index]) toolCalls[tc.index] = { name: '', arguments: '' }
            if (tc.function?.name) toolCalls[tc.index].name = tc.function.name
            if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments
          }
        }
        if (chunk.choices?.[0]?.finish_reason && Object.keys(toolCalls).length > 0 && !toolReadyAt) {
          toolReadyAt = performance.now() - t0
          const names = Object.values(toolCalls).map(t => t.name).join(', ')
          timeline.push(`  tools [${names}] ready at ${toolReadyAt.toFixed(0)}ms`)
          if (mode === 'eager') {
            const n = Object.keys(toolCalls).length
            eagerPromise = Promise.all(Array.from({ length: n }, () => executeTool()))
            timeline.push(`  ${n} tools STARTED at ${toolReadyAt.toFixed(0)}ms (eager)`)
          }
        }
      } catch {}
    }
  }

  const streamDone = performance.now() - t0
  timeline.push(`  stream done at ${streamDone.toFixed(0)}ms (${textLen} chars text)`)

  const nTools = Object.keys(toolCalls).length
  if (mode === 'sequential' && nTools > 0) {
    const toolStart = performance.now() - t0
    timeline.push(`  ${nTools} tools START at ${toolStart.toFixed(0)}ms (sequential)`)
    await Promise.all(Array.from({ length: nTools }, () => executeTool()))
  } else if (eagerPromise) {
    await eagerPromise
  }

  const total = performance.now() - t0
  timeline.push(`  ALL DONE at ${total.toFixed(0)}ms`)

  return { total, streamDone, toolReadyAt, textLen, nTools, timeline }
}

// ── Main ──
async function run() {
  console.log('═'.repeat(65))
  console.log('  Controlled Eager Execution Benchmark')
  console.log('  Same prompt for all runs. Only execution strategy differs.')
  console.log('─'.repeat(65))
  console.log(`  System: "${SYSTEM_PROMPT}"`)
  console.log(`  User:   "${USER_PROMPT}"`)
  console.log(`  Tool latency: ${TOOL_LATENCY_MS}ms`)
  console.log('═'.repeat(65))

  // ── Anthropic ──
  console.log('\n── Anthropic (claude-opus-4-6) ──\n')
  try {
    console.log('  [Sequential]')
    const aSeq = await anthropicRun('sequential')
    aSeq.timeline.forEach(l => console.log('  ' + l))

    console.log('\n  [Eager]')
    const aEager = await anthropicRun('eager')
    aEager.timeline.forEach(l => console.log('  ' + l))

    const saved = aSeq.total - aEager.total
    console.log(`\n  ► Sequential: ${aSeq.total.toFixed(0)}ms`)
    console.log(`  ► Eager:      ${aEager.total.toFixed(0)}ms`)
    console.log(`  ► Saved:      ${saved.toFixed(0)}ms (${(saved/aSeq.total*100).toFixed(1)}%)`)
  } catch (e) {
    console.log('  Error:', e.message)
  }

  // ── Gemma4 ──
  console.log('\n── Gemma4 (local, ' + GEMMA_MODEL + ') ──\n')
  try {
    console.log('  [Sequential]')
    const gSeq = await ollamaRun('sequential')
    gSeq.timeline.forEach(l => console.log('  ' + l))

    console.log('\n  [Eager]')
    const gEager = await ollamaRun('eager')
    gEager.timeline.forEach(l => console.log('  ' + l))

    const saved = gSeq.total - gEager.total
    console.log(`\n  ► Sequential: ${gSeq.total.toFixed(0)}ms`)
    console.log(`  ► Eager:      ${gEager.total.toFixed(0)}ms`)
    console.log(`  ► Saved:      ${saved.toFixed(0)}ms (${(saved/gSeq.total*100).toFixed(1)}%)`)
  } catch (e) {
    console.log('  Error:', e.message)
  }

  console.log('\n' + '═'.repeat(65))
}

run().catch(console.error)
