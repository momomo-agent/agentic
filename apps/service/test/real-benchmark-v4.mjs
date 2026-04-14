// Benchmark v4: zero-cache — every request has unique content
// Random city names + timestamps ensure no prompt caching anywhere

const ANTHROPIC_BASE = 'https://node-hk.sssaicode.com/api'
const ANTHROPIC_KEY = 'sk-sssaicode-8cd160634b7826ddb6e489fdfe278cca27ca5bfd2b68b748d58ff95ec1aced2b'
const ANTHROPIC_MODEL = 'claude-opus-4-6'

const OLLAMA_BASE = 'http://127.0.0.1:11434'
const GEMMA_MODEL = 'gemma4:e4b'

const SYSTEM_PROMPT = 'When using tools, call them FIRST before any text explanation. Do not narrate — just call the tool.'

const CITIES = ['Tokyo', 'Beijing', 'Paris', 'London', 'Seoul', 'Berlin', 'Rome', 'Madrid', 'Cairo', 'Mumbai', 'Sydney', 'Toronto', 'Lagos', 'Lima', 'Bangkok', 'Oslo', 'Dublin', 'Prague', 'Vienna', 'Zurich']

const TOOL_LATENCY_MS = 300
const ROUNDS = 4

function randomCity() { return CITIES[Math.floor(Math.random() * CITIES.length)] }
function uniquePrompt() {
  const c1 = randomCity(), c2 = randomCity()
  return `[req-${Date.now()}-${Math.random().toString(36).slice(2,8)}] What's the weather in ${c1} and ${c2}? Use get_weather for each.`
}
function executeTool() { return new Promise(r => setTimeout(() => r({ temp: 22 }), TOOL_LATENCY_MS)) }

// ── Anthropic ──
async function anthropicRun(mode) {
  const prompt = uniquePrompt()
  const body = {
    model: ANTHROPIC_MODEL, max_tokens: 1024, stream: true,
    tools: [{ name: 'get_weather', description: 'Get weather for a city',
      input_schema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }
    }],
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  }

  const t0 = performance.now()
  const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', currentTool = null, currentToolInput = '', textLen = 0
  let toolReadyTimes = [], eagerPromises = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n'); buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue
      try {
        const e = JSON.parse(data)
        if (e.type === 'content_block_delta') {
          if (e.delta?.type === 'text_delta') textLen += e.delta.text.length
          if (e.delta?.type === 'input_json_delta') currentToolInput += e.delta.partial_json || ''
        } else if (e.type === 'content_block_start' && e.content_block?.type === 'tool_use') {
          currentTool = e.content_block; currentToolInput = ''
        } else if (e.type === 'content_block_stop' && currentTool) {
          toolReadyTimes.push(performance.now() - t0)
          if (mode === 'eager') eagerPromises.push(executeTool())
          currentTool = null
        }
      } catch {}
    }
  }

  const streamDone = performance.now() - t0
  if (mode === 'sequential') await Promise.all(toolReadyTimes.map(() => executeTool()))
  else await Promise.all(eagerPromises)
  const total = performance.now() - t0

  // Time between last tool ready and stream done = overlap window
  const lastToolReady = toolReadyTimes[toolReadyTimes.length - 1] || streamDone
  const overlapWindow = streamDone - lastToolReady

  return { total, streamDone, lastToolReady, overlapWindow, textLen, nTools: toolReadyTimes.length }
}

// ── Ollama ──
async function ollamaRun(mode) {
  const prompt = uniquePrompt()
  const body = {
    model: GEMMA_MODEL, stream: true,
    tools: [{ type: 'function', function: { name: 'get_weather', description: 'Get weather for a city',
      parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }
    }}],
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  }

  const t0 = performance.now()
  const res = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', toolCalls = {}, textLen = 0, toolReadyAt = null, eagerPromise = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n'); buffer = lines.pop() || ''
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
          const n = Object.keys(toolCalls).length
          if (mode === 'eager') eagerPromise = Promise.all(Array.from({ length: n }, () => executeTool()))
        }
      } catch {}
    }
  }

  const streamDone = performance.now() - t0
  const nTools = Object.keys(toolCalls).length
  if (mode === 'sequential' && nTools > 0) await Promise.all(Array.from({ length: nTools }, () => executeTool()))
  else if (eagerPromise) await eagerPromise
  const total = performance.now() - t0

  const overlapWindow = streamDone - (toolReadyAt || streamDone)

  return { total, streamDone, toolReadyAt, overlapWindow, textLen, nTools }
}

function fmt(ms) { return ms.toFixed(0) + 'ms' }

async function run() {
  console.log('═'.repeat(65))
  console.log('  Benchmark v4 — Zero Cache (unique prompts per request)')
  console.log('  ' + ROUNDS + ' rounds, interleaved, tool latency ' + TOOL_LATENCY_MS + 'ms')
  console.log('═'.repeat(65))

  // ── Warmup Ollama ──
  console.log('\n  Warming up Ollama...')
  await ollamaRun('sequential')

  // ── Anthropic ──
  console.log('\n── Anthropic (claude-opus-4-6) ──')
  const aSeq = [], aEager = []
  for (let i = 0; i < ROUNDS; i++) {
    const s = await anthropicRun('sequential'); aSeq.push(s)
    console.log(`  R${i+1} seq:   total=${fmt(s.total)} stream=${fmt(s.streamDone)} overlap=${fmt(s.overlapWindow)} text=${s.textLen}ch tools=${s.nTools}`)
    const e = await anthropicRun('eager'); aEager.push(e)
    console.log(`  R${i+1} eager: total=${fmt(e.total)} stream=${fmt(e.streamDone)} overlap=${fmt(e.overlapWindow)} text=${e.textLen}ch tools=${e.nTools}`)
  }

  const aSeqAvg = aSeq.reduce((a, b) => a + b.total, 0) / ROUNDS
  const aEagerAvg = aEager.reduce((a, b) => a + b.total, 0) / ROUNDS
  const aOverlapAvg = aSeq.reduce((a, b) => a + b.overlapWindow, 0) / ROUNDS
  console.log(`\n  Sequential avg: ${fmt(aSeqAvg)}`)
  console.log(`  Eager avg:      ${fmt(aEagerAvg)}`)
  console.log(`  Avg overlap window: ${fmt(aOverlapAvg)} (time after last tool_use before stream ends)`)
  console.log(`  Δ: ${(aSeqAvg - aEagerAvg).toFixed(0)}ms (${((aSeqAvg - aEagerAvg)/aSeqAvg*100).toFixed(1)}%)`)

  // ── Gemma4 ──
  console.log('\n── Gemma4 (local, ' + GEMMA_MODEL + ') ──')
  const gSeq = [], gEager = []
  for (let i = 0; i < ROUNDS; i++) {
    const s = await ollamaRun('sequential'); gSeq.push(s)
    console.log(`  R${i+1} seq:   total=${fmt(s.total)} stream=${fmt(s.streamDone)} overlap=${fmt(s.overlapWindow)} text=${s.textLen}ch tools=${s.nTools}`)
    const e = await ollamaRun('eager'); gEager.push(e)
    console.log(`  R${i+1} eager: total=${fmt(e.total)} stream=${fmt(e.streamDone)} overlap=${fmt(e.overlapWindow)} text=${e.textLen}ch tools=${e.nTools}`)
  }

  const gSeqAvg = gSeq.reduce((a, b) => a + b.total, 0) / ROUNDS
  const gEagerAvg = gEager.reduce((a, b) => a + b.total, 0) / ROUNDS
  const gOverlapAvg = gSeq.reduce((a, b) => a + b.overlapWindow, 0) / ROUNDS
  console.log(`\n  Sequential avg: ${fmt(gSeqAvg)}`)
  console.log(`  Eager avg:      ${fmt(gEagerAvg)}`)
  console.log(`  Avg overlap window: ${fmt(gOverlapAvg)}`)
  console.log(`  Δ: ${(gSeqAvg - gEagerAvg).toFixed(0)}ms (${((gSeqAvg - gEagerAvg)/gSeqAvg*100).toFixed(1)}%)`)

  console.log('\n' + '═'.repeat(65))
}

run().catch(console.error)
