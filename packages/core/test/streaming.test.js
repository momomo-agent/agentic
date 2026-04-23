// agentic-core streaming upgrade tests
import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

let fetchCalls = []
let fetchResponses = []

function pushFetchResponse(body, status = 200) {
  fetchResponses.push({ body, status })
}

const originalFetch = globalThis.fetch
beforeEach(() => {
  fetchCalls = []
  fetchResponses = []
  globalThis.fetch = mock.fn(async (url, options) => {
    fetchCalls.push({ url, options })
    const resp = fetchResponses.shift()
    if (!resp) throw new Error('No mock fetch response queued')
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      text: async () => JSON.stringify(resp.body),
      json: async () => resp.body,
      headers: new Map(),
    }
  })
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

const mod = await import(join(__dirname, '..', 'src', 'index.js'))
const exports = mod.default || mod
const { agenticAsk, classifyError } = exports

function anthropicTextResponse(text) {
  return {
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
  }
}

function anthropicToolResponse(text, toolCalls) {
  return {
    content: [
      ...(text ? [{ type: 'text', text }] : []),
      ...toolCalls.map(tc => ({
        type: 'tool_use', id: tc.id || `toolu_${Math.random().toString(36).slice(2)}`,
        name: tc.name, input: tc.input,
      })),
    ],
    stop_reason: 'tool_use',
  }
}

// ── Generator Mode ──

describe('generator mode', () => {
  it('returns an async generator when no emit callback', async () => {
    pushFetchResponse(anthropicTextResponse('Hello from generator'))

    const gen = agenticAsk('test', {
      apiKey: 'sk-test',
      model: 'claude-test',
      tools: [],
      stream: false,
    })

    // Should be an async iterable
    assert.equal(typeof gen[Symbol.asyncIterator], 'function')

    const events = []
    for await (const event of gen) {
      events.push(event)
    }

    // Should have status, text_delta, and done events
    assert.ok(events.some(e => e.type === 'status'), 'should yield status')
    assert.ok(events.some(e => e.type === 'text_delta'), 'should yield text_delta')
    const done = events.find(e => e.type === 'done')
    assert.ok(done, 'should yield done')
    assert.equal(done.answer, 'Hello from generator')
    assert.equal(done.rounds, 1)
  })

  it('yields tool_use and tool_result events during tool loop', async () => {
    // Round 1: tool call
    pushFetchResponse(anthropicToolResponse('Let me search.', [
      { id: 'call_1', name: 'search', input: { query: 'test' } },
    ]))
    // search API response
    pushFetchResponse({ results: [{ title: 'Result' }] })
    // Round 2: end turn
    pushFetchResponse(anthropicTextResponse('Found it.'))

    const events = []
    for await (const event of agenticAsk('search for test', {
      apiKey: 'sk-test',
      model: 'claude-test',
      tools: ['search'],
      searchApiKey: 'tvly-test',
      stream: false,
    })) {
      events.push(event)
    }

    assert.ok(events.some(e => e.type === 'tool_use' && e.name === 'search'), 'should yield tool_use')
    assert.ok(events.some(e => e.type === 'tool_result' && e.name === 'search'), 'should yield tool_result')
    const done = events.find(e => e.type === 'done')
    assert.equal(done.answer, 'Found it.')
    assert.equal(done.rounds, 2)
  })

  it('ChatEvent sequence: status → text_delta → done', async () => {
    pushFetchResponse(anthropicTextResponse('Simple answer'))

    const types = []
    for await (const event of agenticAsk('test', {
      apiKey: 'sk-test',
      model: 'claude-test',
      tools: [],
      stream: false,
    })) {
      types.push(event.type)
    }

    assert.deepEqual(types, ['status', 'text_delta', 'done'])
  })
})

// ── AbortSignal ──

describe('abort signal', () => {
  it('yields error event when signal is already aborted', async () => {
    const ac = new AbortController()
    ac.abort()

    const events = []
    for await (const event of agenticAsk('test', {
      apiKey: 'sk-test',
      model: 'claude-test',
      tools: [],
      stream: false,
      signal: ac.signal,
    })) {
      events.push(event)
    }

    const err = events.find(e => e.type === 'error')
    assert.ok(err, 'should yield error event')
    assert.equal(err.error, 'aborted')
  })

  it('aborts before tool execution', async () => {
    const ac = new AbortController()

    // Round 1: tool call
    pushFetchResponse(anthropicToolResponse('Searching.', [
      { id: 'call_1', name: 'search', input: { query: 'test' } },
    ]))

    // Abort after first LLM call returns
    const events = []
    let eventCount = 0
    for await (const event of agenticAsk('test', {
      apiKey: 'sk-test',
      model: 'claude-test',
      tools: ['search'],
      searchApiKey: 'tvly-test',
      stream: false,
      signal: ac.signal,
    })) {
      events.push(event)
      eventCount++
      // Abort after receiving the text_delta (before tool execution)
      if (event.type === 'text_delta') {
        ac.abort()
      }
    }

    const err = events.find(e => e.type === 'error')
    assert.ok(err, 'should yield error on abort')
    assert.equal(err.error, 'aborted')
    // Should NOT have tool_result since we aborted
    assert.ok(!events.some(e => e.type === 'tool_result'), 'should not execute tool after abort')
  })
})

// ── Provider Failover ──

describe('provider failover', () => {
  it('fails over to second provider on 500 error', async () => {
    // First provider: 500 error
    pushFetchResponse({ error: 'Internal Server Error' }, 500)
    // Second provider: success
    pushFetchResponse(anthropicTextResponse('From backup provider'))

    const events = []
    for await (const event of agenticAsk('test', {
      apiKey: 'sk-primary',
      model: 'claude-test',
      tools: [],
      stream: false,
      providers: [
        { provider: 'anthropic', apiKey: 'sk-primary', model: 'claude-test' },
        { provider: 'anthropic', apiKey: 'sk-backup', model: 'claude-test' },
      ],
    })) {
      events.push(event)
    }

    const done = events.find(e => e.type === 'done')
    assert.ok(done, 'should complete via backup provider')
    assert.equal(done.answer, 'From backup provider')
  })

  it('fails over on 429 rate limit', async () => {
    pushFetchResponse({ error: 'Rate limited' }, 429)
    pushFetchResponse(anthropicTextResponse('Success after failover'))

    const events = []
    for await (const event of agenticAsk('test', {
      apiKey: 'sk-test',
      model: 'claude-test',
      tools: [],
      stream: false,
      providers: [
        { provider: 'anthropic', apiKey: 'sk-a', model: 'claude-test' },
        { provider: 'anthropic', apiKey: 'sk-b', model: 'claude-test' },
      ],
    })) {
      events.push(event)
    }

    const done = events.find(e => e.type === 'done')
    assert.ok(done)
    assert.equal(done.answer, 'Success after failover')
  })

  it('yields error when all providers fail', async () => {
    pushFetchResponse({ error: 'Error 1' }, 500)
    pushFetchResponse({ error: 'Error 2' }, 500)

    const events = []
    for await (const event of agenticAsk('test', {
      apiKey: 'sk-test',
      model: 'claude-test',
      tools: [],
      stream: false,
      providers: [
        { provider: 'anthropic', apiKey: 'sk-a', model: 'claude-test' },
        { provider: 'anthropic', apiKey: 'sk-b', model: 'claude-test' },
      ],
    })) {
      events.push(event)
    }

    const err = events.find(e => e.type === 'error')
    assert.ok(err, 'should yield error when all providers fail')
    assert.equal(err.category, 'server')
    assert.equal(err.retryable, true)
  })
})

// ── Error Classification ──

describe('error classification', () => {
  it('classifies 401 as auth', () => {
    const err = new Error('API error 401: Unauthorized')
    err.status = 401
    const cls = classifyError(err)
    assert.equal(cls.category, 'auth')
    assert.equal(cls.retryable, false)
  })

  it('classifies 429 as rate_limit', () => {
    const err = new Error('API error 429: Too Many Requests')
    err.status = 429
    const cls = classifyError(err)
    assert.equal(cls.category, 'rate_limit')
    assert.equal(cls.retryable, true)
  })

  it('classifies 500 as server', () => {
    const err = new Error('API error 500: Internal Server Error')
    err.status = 500
    const cls = classifyError(err)
    assert.equal(cls.category, 'server')
    assert.equal(cls.retryable, true)
  })

  it('classifies 402 as billing', () => {
    const err = new Error('API error 402: Payment Required')
    err.status = 402
    const cls = classifyError(err)
    assert.equal(cls.category, 'billing')
    assert.equal(cls.retryable, false)
  })

  it('classifies network errors', () => {
    const err = new Error('fetch failed: ECONNREFUSED')
    const cls = classifyError(err)
    assert.equal(cls.category, 'network')
    assert.equal(cls.retryable, true)
  })

  it('classifies context overflow', () => {
    const err = new Error('maximum context length exceeded')
    const cls = classifyError(err)
    assert.equal(cls.category, 'context_overflow')
    assert.equal(cls.retryable, false)
  })

  it('classifies unknown errors', () => {
    const err = new Error('something weird happened')
    const cls = classifyError(err)
    assert.equal(cls.category, 'unknown')
    assert.equal(cls.retryable, false)
  })

  it('classifies string errors', () => {
    const cls = classifyError('rate limit exceeded')
    assert.equal(cls.category, 'rate_limit')
    assert.equal(cls.retryable, true)
  })
})
