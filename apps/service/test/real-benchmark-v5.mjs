// Benchmark v5: Real tools (TMDB + Tavily) with actual API latency
// This is the real-world scenario: LLM calls tools that hit external APIs

const ANTHROPIC_BASE = 'https://node-hk.sssaicode.com/api'
const ANTHROPIC_KEY = 'sk-sssaicode-8cd160634b7826ddb6e489fdfe278cca27ca5bfd2b68b748d58ff95ec1aced2b'
const ANTHROPIC_MODEL = 'claude-opus-4-6'

const OLLAMA_BASE = 'http://127.0.0.1:11434'
const GEMMA_MODEL = 'gemma4:e4b'

const TMDB_KEY = 'd1c3584adffc69f94f0ecec25624f90a'
const TAVILY_KEY = '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'

const SYSTEM_PROMPT = 'When using tools, call them FIRST before any text explanation. Do not narrate — just call the tool, then explain after results.'

const MOVIES = ['Inception', 'Parasite', 'Spirited Away', 'The Matrix', 'Interstellar', 'Dune', 'Oppenheimer', 'Everything Everywhere All at Once']

function randomMovie() { return MOVIES[Math.floor(Math.random() * MOVIES.length)] }

// Real tool implementations
async function executeToolReal(name, input) {
  const t0 = performance.now()
  let result
  if (name === 'search_movie') {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&language=zh-CN&query=${encodeURIComponent(input.query)}`
    const res = await fetch(url)
    const data = await res.json()
    result = (data.results || []).slice(0, 3).map(m => ({
      title: m.title, year: m.release_date?.slice(0, 4), rating: m.vote_average,
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    }))
  } else if (name === 'web_search') {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: TAVILY_KEY, query: input.query, max_results: 3, include_images: true }),
    })
    const data = await res.json()
    result = { results: (data.results || []).slice(0, 3).map(r => ({ title: r.title, url: r.url })), images: (data.images || []).slice(0, 3) }
  }
  const latency = performance.now() - t0
  return { result, latency }
}

const TOOL_DEFS_ANTHROPIC = [
  { name: 'search_movie', description: 'Search movies via TMDB. Returns poster URLs, ratings, release dates.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'web_search', description: 'Search the web for information and images.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
]

const TOOL_DEFS_OPENAI = TOOL_DEFS_ANTHROPIC.map(t => ({
  type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema }
}))

// ── Anthropic ──
async function anthropicRun(mode) {
  const movie = randomMovie()
  const prompt = `[${Date.now()}] Search for the movie "${movie}" using search_movie, and also web_search for "${movie} movie review". I want both results.`

  const body = {
    model: ANTHROPIC_MODEL, max_tokens: 2048, stream: true,
    tools: TOOL_DEFS_ANTHROPIC, system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  }

  const t0 = performance.now()
  const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', currentTool = null, currentToolInput = '', textLen = 0
  let toolEvents = [] // { name, input, readyAt }
  let eagerPromises = [] // { name, promise, startedAt }

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
          currentTool = { id: e.content_block.id, name: e.content_block.name }; currentToolInput = ''
        } else if (e.type === 'content_block_stop' && currentTool) {
          let input = {}
          try { input = JSON.parse(currentToolInput || '{}') } catch {}
          const readyAt = performance.now() - t0
          toolEvents.push({ name: currentTool.name, input, readyAt })

          if (mode === 'eager') {
            const startedAt = performance.now() - t0
            const p = executeToolReal(currentTool.name, input)
            eagerPromises.push({ name: currentTool.name, promise: p, startedAt })
          }
          currentTool = null
        }
      } catch {}
    }
  }

  const streamDone = performance.now() - t0

  let toolResults = []
  if (mode === 'sequential') {
    const toolStart = performance.now() - t0
    const results = await Promise.all(toolEvents.map(te => executeToolReal(te.name, te.input)))
    toolResults = results.map((r, i) => ({
      name: toolEvents[i].name, latency: r.latency, startedAt: toolStart
    }))
  } else {
    const results = await Promise.all(eagerPromises.map(ep => ep.promise))
    toolResults = results.map((r, i) => ({
      name: eagerPromises[i].name, latency: r.latency, startedAt: eagerPromises[i].startedAt
    }))
  }

  const total = performance.now() - t0

  return { total, streamDone, textLen, toolEvents, toolResults, movie }
}

// ── Ollama ──
async function ollamaRun(mode) {
  const movie = randomMovie()
  const prompt = `[${Date.now()}] Search for the movie "${movie}" using search_movie tool.`

  const body = {
    model: GEMMA_MODEL, stream: true, tools: TOOL_DEFS_OPENAI,
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
  let buffer = '', toolCalls = {}, textLen = 0, toolReadyAt = null
  let eagerPromises = []

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
          if (mode === 'eager') {
            for (const tc of Object.values(toolCalls)) {
              let input = {}; try { input = JSON.parse(tc.arguments || '{}') } catch {}
              eagerPromises.push({ name: tc.name, promise: executeToolReal(tc.name, input), startedAt: toolReadyAt })
            }
          }
        }
      } catch {}
    }
  }

  const streamDone = performance.now() - t0
  let toolResults = []
  const tcList = Object.values(toolCalls).filter(t => t.name)

  if (mode === 'sequential' && tcList.length > 0) {
    const toolStart = performance.now() - t0
    const results = await Promise.all(tcList.map(tc => {
      let input = {}; try { input = JSON.parse(tc.arguments || '{}') } catch {}
      return executeToolReal(tc.name, input)
    }))
    toolResults = results.map((r, i) => ({ name: tcList[i].name, latency: r.latency, startedAt: toolStart }))
  } else {
    const results = await Promise.all(eagerPromises.map(ep => ep.promise))
    toolResults = results.map((r, i) => ({ name: eagerPromises[i].name, latency: r.latency, startedAt: eagerPromises[i].startedAt }))
  }

  const total = performance.now() - t0
  return { total, streamDone, textLen, toolReadyAt, toolResults, movie, nTools: tcList.length }
}

function fmt(ms) { return ms.toFixed(0) + 'ms' }

async function run() {
  console.log('═'.repeat(65))
  console.log('  Benchmark v5 — Real Tools (TMDB + Tavily)')
  console.log('  Actual API calls with real network latency')
  console.log('═'.repeat(65))

  // Warmup
  console.log('\n  Warming up APIs...')
  await executeToolReal('search_movie', { query: 'test' })
  await executeToolReal('web_search', { query: 'test' })

  const ROUNDS = 3

  // ── Anthropic ──
  console.log('\n── Anthropic (claude-opus-4-6) — 2 tools per request ──\n')
  const aSeq = [], aEager = []
  for (let i = 0; i < ROUNDS; i++) {
    const s = await anthropicRun('sequential'); aSeq.push(s)
    const toolInfo = s.toolResults.map(t => `${t.name}(${fmt(t.latency)})`).join(' + ')
    console.log(`  R${i+1} seq:   ${fmt(s.total)} | stream ${fmt(s.streamDone)} | tools: ${toolInfo} | "${s.movie}"`)

    const e = await anthropicRun('eager'); aEager.push(e)
    const eToolInfo = e.toolResults.map(t => `${t.name}(${fmt(t.latency)} @${fmt(t.startedAt)})`).join(' + ')
    console.log(`  R${i+1} eager: ${fmt(e.total)} | stream ${fmt(e.streamDone)} | tools: ${eToolInfo} | "${e.movie}"`)
  }

  const aSeqAvg = aSeq.reduce((a, b) => a + b.total, 0) / ROUNDS
  const aEagerAvg = aEager.reduce((a, b) => a + b.total, 0) / ROUNDS
  const saved = aSeqAvg - aEagerAvg
  console.log(`\n  Sequential avg: ${fmt(aSeqAvg)}`)
  console.log(`  Eager avg:      ${fmt(aEagerAvg)}`)
  console.log(`  Δ: ${saved.toFixed(0)}ms (${(saved/aSeqAvg*100).toFixed(1)}%)`)

  // ── Gemma4 ──
  console.log('\n── Gemma4 (local) — 1 tool per request ──\n')
  // Warmup ollama
  await ollamaRun('sequential').catch(() => {})

  const gSeq = [], gEager = []
  for (let i = 0; i < ROUNDS; i++) {
    const s = await ollamaRun('sequential'); gSeq.push(s)
    const toolInfo = s.toolResults.map(t => `${t.name}(${fmt(t.latency)})`).join(' + ')
    console.log(`  R${i+1} seq:   ${fmt(s.total)} | stream ${fmt(s.streamDone)} | tools: ${toolInfo} | "${s.movie}"`)

    const e = await ollamaRun('eager'); gEager.push(e)
    const eToolInfo = e.toolResults.map(t => `${t.name}(${fmt(t.latency)} @${fmt(t.startedAt)})`).join(' + ')
    console.log(`  R${i+1} eager: ${fmt(e.total)} | stream ${fmt(e.streamDone)} | tools: ${eToolInfo} | "${e.movie}"`)
  }

  const gSeqAvg = gSeq.reduce((a, b) => a + b.total, 0) / ROUNDS
  const gEagerAvg = gEager.reduce((a, b) => a + b.total, 0) / ROUNDS
  const gSaved = gSeqAvg - gEagerAvg
  console.log(`\n  Sequential avg: ${fmt(gSeqAvg)}`)
  console.log(`  Eager avg:      ${fmt(gEagerAvg)}`)
  console.log(`  Δ: ${gSaved.toFixed(0)}ms (${(gSaved/gSeqAvg*100).toFixed(1)}%)`)

  console.log('\n' + '═'.repeat(65))
}

run().catch(console.error)
