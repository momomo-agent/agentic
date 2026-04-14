// Controlled benchmark v3: warmup + interleaved runs + averages
// Eliminates cache bias by warming up first, then alternating seq/eager

const ANTHROPIC_BASE = 'https://node-hk.sssaicode.com/api'
const ANTHROPIC_KEY = 'sk-sssaicode-8cd160634b7826ddb6e489fdfe278cca27ca5bfd2b68b748d58ff95ec1aced2b'
const ANTHROPIC_MODEL = 'claude-opus-4-6'

const OLLAMA_BASE = 'http://127.0.0.1:11434'
const GEMMA_MODEL = 'gemma4:e4b'

const SYSTEM_PROMPT = 'When using tools, call them FIRST before any text explanation. Do not narrate what you are about to do — just call the tool, then explain after you have the result.'
const USER_PROMPT = 'What is the weather in Tokyo and Beijing? Use the get_weather tool for each city.'

const TOOL_LATENCY_MS = 300
const ROUNDS = 3 // per mode

function executeTool() {
  return new Promise(r => setTimeout(() => r({ temp: 22, condition: 'sunny' }), TOOL_LATENCY_MS))
}

// ── Anthropic ──
async function anthropicRun(mode) {
  const body = {
    model: ANTHROPIC_MODEL, max_tokens: 1024, stream: true,
    tools: [{ name: 'get_weather', description: 'Get current weather for a city',
      input_schema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }
    }],
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: USER_PROMPT }]
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
  let toolsReadyAt = [], eagerPromises = []

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
          toolsReadyAt.push(performance.now() - t0)
          if (mode === 'eager') eagerPromises.push(executeTool())
          currentTool = null
        }
      } catch {}
    }
  }

  const streamDone = performance.now() - t0
  if (mode === 'sequential') await Promise.all(toolsReadyAt.map(() => executeTool()))
  else await Promise.all(eagerPromises)
  const total = performance.now() - t0

  return { total, streamDone, toolsReadyAt, textLen, nTools: toolsReadyAt.length }
}

// ── Ollama ──
async function ollamaRun(mode) {
  const body = {
    model: GEMMA_MODEL, stream: true,
    tools: [{ type: 'function', function: { name: 'get_weather', description: 'Get current weather for a city',
      parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }
    }}],
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT }
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

  return { total, streamDone, toolReadyAt, textLen, nTools }
}

// ── Stats ──
function stats(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length
  const med = sorted[Math.floor(sorted.length / 2)]
  const min = sorted[0], max = sorted[sorted.length - 1]
  return { avg, med, min, max }
}

function fmt(ms) { return ms.toFixed(0) + 'ms' }

// ── Main ──
async function run() {
  console.log('═'.repeat(65))
  console.log('  Controlled Benchmark v3 — Warmup + Interleaved')
  console.log('  ' + ROUNDS + ' rounds per mode, alternating seq/eager')
  console.log('  Tool latency: ' + TOOL_LATENCY_MS + 'ms')
  console.log('═'.repeat(65))

  // ── Anthropic ──
  console.log('\n── Anthropic (claude-opus-4-6) ──')
  try {
    console.log('  Warmup...')
    await anthropicRun('sequential') // warmup, discard

    const seqTimes = [], eagerTimes = []
    for (let i = 0; i < ROUNDS; i++) {
      // Alternate to avoid ordering bias
      if (i % 2 === 0) {
        const s = await anthropicRun('sequential'); seqTimes.push(s.total)
        console.log(`  R${i+1} seq:   ${fmt(s.total)} (stream ${fmt(s.streamDone)}, ${s.nTools} tools)`)
        const e = await anthropicRun('eager'); eagerTimes.push(e.total)
        console.log(`  R${i+1} eager: ${fmt(e.total)} (stream ${fmt(e.streamDone)}, ${e.nTools} tools)`)
      } else {
        const e = await anthropicRun('eager'); eagerTimes.push(e.total)
        console.log(`  R${i+1} eager: ${fmt(e.total)} (stream ${fmt(e.streamDone)}, ${e.nTools} tools)`)
        const s = await anthropicRun('sequential'); seqTimes.push(s.total)
        console.log(`  R${i+1} seq:   ${fmt(s.total)} (stream ${fmt(s.streamDone)}, ${s.nTools} tools)`)
      }
    }

    const ss = stats(seqTimes), es = stats(eagerTimes)
    const saved = ss.avg - es.avg
    console.log(`\n  Sequential: avg ${fmt(ss.avg)}  med ${fmt(ss.med)}  [${fmt(ss.min)}–${fmt(ss.max)}]`)
    console.log(`  Eager:      avg ${fmt(es.avg)}  med ${fmt(es.med)}  [${fmt(es.min)}–${fmt(es.max)}]`)
    console.log(`  Δ avg:      ${saved > 0 ? '-' : '+'}${fmt(Math.abs(saved))} (${(saved/ss.avg*100).toFixed(1)}%)`)
  } catch (e) { console.log('  Error:', e.message) }

  // ── Gemma4 ──
  console.log('\n── Gemma4 (local, ' + GEMMA_MODEL + ') ──')
  try {
    console.log('  Warmup...')
    await ollamaRun('sequential') // warmup

    const seqTimes = [], eagerTimes = []
    for (let i = 0; i < ROUNDS; i++) {
      if (i % 2 === 0) {
        const s = await ollamaRun('sequential'); seqTimes.push(s.total)
        console.log(`  R${i+1} seq:   ${fmt(s.total)} (stream ${fmt(s.streamDone)}, ${s.nTools} tools)`)
        const e = await ollamaRun('eager'); eagerTimes.push(e.total)
        console.log(`  R${i+1} eager: ${fmt(e.total)} (stream ${fmt(e.streamDone)}, ${e.nTools} tools)`)
      } else {
        const e = await ollamaRun('eager'); eagerTimes.push(e.total)
        console.log(`  R${i+1} eager: ${fmt(e.total)} (stream ${fmt(e.streamDone)}, ${e.nTools} tools)`)
        const s = await ollamaRun('sequential'); seqTimes.push(s.total)
        console.log(`  R${i+1} seq:   ${fmt(s.total)} (stream ${fmt(s.streamDone)}, ${s.nTools} tools)`)
      }
    }

    const ss = stats(seqTimes), es = stats(eagerTimes)
    const saved = ss.avg - es.avg
    console.log(`\n  Sequential: avg ${fmt(ss.avg)}  med ${fmt(ss.med)}  [${fmt(ss.min)}–${fmt(ss.max)}]`)
    console.log(`  Eager:      avg ${fmt(es.avg)}  med ${fmt(es.med)}  [${fmt(es.min)}–${fmt(es.max)}]`)
    console.log(`  Δ avg:      ${saved > 0 ? '-' : '+'}${fmt(Math.abs(saved))} (${(saved/ss.avg*100).toFixed(1)}%)`)
  } catch (e) { console.log('  Error:', e.message) }

  console.log('\n' + '═'.repeat(65))
}

run().catch(console.error)
