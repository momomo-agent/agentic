// Test that agenticAsk generator yields token-level text_delta events
// when using streaming mode (not one big chunk)
import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mod = await import(join(__dirname, '..', 'agentic-core.js'))
const { agenticAsk } = mod.default || mod

// Helper: create a fake SSE ReadableStream that yields tokens one by one
function createSSEStream(events) {
  const encoder = new TextEncoder()
  let idx = 0
  return new ReadableStream({
    pull(controller) {
      if (idx < events.length) {
        const line = `data: ${JSON.stringify(events[idx])}\n\n`
        controller.enqueue(encoder.encode(line))
        idx++
      } else {
        controller.close()
      }
    }
  })
}

const originalFetch = globalThis.fetch

describe('true token-level streaming', () => {
  afterEach(() => { globalThis.fetch = originalFetch })

  it('yields multiple text_delta events (not one big chunk)', async () => {
    // Simulate Anthropic SSE: 3 separate content_block_delta events
    const sseEvents = [
      { type: 'message_start', message: { id: 'msg_1', role: 'assistant', content: [] } },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' world' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '!' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
      { type: 'message_stop' },
    ]

    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      body: createSSEStream(sseEvents),
    }))

    const gen = agenticAsk('test streaming', {
      apiKey: 'sk-test',
      provider: 'anthropic',
      model: 'claude-test',
      tools: [],
      stream: true,
    })

    const events = []
    for await (const evt of gen) {
      events.push(evt)
    }

    // Should have multiple text_delta events, not just one
    const textDeltas = events.filter(e => e.type === 'text_delta')
    assert.ok(textDeltas.length >= 3, `Expected >=3 text_delta events, got ${textDeltas.length}: ${JSON.stringify(textDeltas)}`)
    assert.equal(textDeltas[0].text, 'Hello')
    assert.equal(textDeltas[1].text, ' world')
    assert.equal(textDeltas[2].text, '!')

    // Should end with done
    const done = events.find(e => e.type === 'done')
    assert.ok(done, 'Should have a done event')
    assert.equal(done.answer, 'Hello world!')
  })

  it('yields text_delta during tool rounds too', async () => {
    let callCount = 0
    globalThis.fetch = mock.fn(async (url) => {
      callCount++
      if (callCount === 1) {
        // Round 1: text + tool_use
        return {
          ok: true, status: 200,
          body: createSSEStream([
            { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
            { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Let me ' } },
            { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'search.' } },
            { type: 'content_block_stop', index: 0 },
            { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tool_1', name: 'search' } },
            { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"query":"test"}' } },
            { type: 'content_block_stop', index: 1 },
            { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
          ]),
        }
      } else if (callCount === 2) {
        // Search API mock
        return { ok: true, status: 200, text: async () => JSON.stringify({ results: [{ title: 'Result' }] }), json: async () => ({ results: [{ title: 'Result' }] }) }
      } else {
        // Round 2: final answer
        return {
          ok: true, status: 200,
          body: createSSEStream([
            { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
            { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Found it!' } },
            { type: 'content_block_stop', index: 0 },
            { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
          ]),
        }
      }
    })

    const events = []
    for await (const evt of agenticAsk('search test', {
      apiKey: 'sk-test', provider: 'anthropic', model: 'claude-test',
      tools: ['search'], searchApiKey: 'tvly-test', stream: true,
    })) {
      events.push(evt)
    }

    const textDeltas = events.filter(e => e.type === 'text_delta')
    // Round 1: "Let me " + "search." + Round 2: "Found it!"
    assert.ok(textDeltas.length >= 3, `Expected >=3 text_delta, got ${textDeltas.length}`)
    assert.equal(textDeltas[0].text, 'Let me ')
    assert.equal(textDeltas[1].text, 'search.')

    // Should have tool events
    assert.ok(events.some(e => e.type === 'tool_use'), 'Should have tool_use event')
    assert.ok(events.some(e => e.type === 'tool_result'), 'Should have tool_result event')
  })
})
