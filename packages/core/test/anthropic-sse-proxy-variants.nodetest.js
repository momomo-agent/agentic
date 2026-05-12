// Unit tests for _streamAnthropicGen proxy-variant robustness.
// These tests feed synthetic SSE streams (not the live API) to agenticAsk with
// stream: true, using a fetch mock so we can exercise the Anthropic SSE parser
// with the kinds of proxy quirks we've seen in the wild (Xiaomi mioffice, etc.).

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { agenticAsk } = await import(join(__dirname, '..', 'src', 'index.js'))

function makeSSEStream(chunks) {
  const encoder = new TextEncoder()
  let i = 0
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) { controller.close(); return }
      controller.enqueue(encoder.encode(chunks[i++]))
    },
  })
}

function installFetchMock(body) {
  const orig = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    body: makeSSEStream(Array.isArray(body) ? body : [body]),
    text: async () => '',
    json: async () => ({}),
    headers: new Map(),
  })
  return () => { globalThis.fetch = orig }
}

async function collect(gen) {
  const events = []
  for await (const e of gen) events.push(e)
  return events
}

function textOf(events) {
  return events.filter(e => e.type === 'text_delta').map(e => e.text).join('')
}

const baseConfig = {
  provider: 'anthropic',
  apiKey: 'test-key',
  baseUrl: 'https://example.test',
  model: 'claude-test',
  tools: [],
  stream: true,
}

describe('_streamAnthropicGen proxy variants', () => {
  let restore

  afterEach(() => { if (restore) restore() })

  it('parses canonical Anthropic SSE (event: + data: + blank-line boundary)', async () => {
    restore = installFetchMock([
      'event: message_start\ndata: {"type":"message_start","message":{"id":"m1","usage":{"input_tokens":1,"output_tokens":0}}}\n\n',
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}\n\n',
      'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ])
    const events = await collect(agenticAsk('hi', baseConfig))
    assert.equal(textOf(events), 'Hello world')
    const done = events.find(e => e.type === 'done')
    assert.ok(done, 'expected done event')
    assert.equal(done.stopReason, 'end_turn')
  })

  it('parses proxies that drop `data:` space (data:{...})', async () => {
    restore = installFetchMock([
      'event:content_block_delta\ndata:{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"compact "}}\n\n',
      'event:content_block_delta\ndata:{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}\n\n',
      'event:message_delta\ndata:{"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
    ])
    const events = await collect(agenticAsk('hi', baseConfig))
    assert.equal(textOf(events), 'compact ok')
  })

  it('parses CRLF-terminated SSE', async () => {
    restore = installFetchMock([
      'event: content_block_delta\r\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"crlf"}}\r\n\r\n',
      'event: message_delta\r\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\r\n\r\n',
    ])
    const events = await collect(agenticAsk('hi', baseConfig))
    assert.equal(textOf(events), 'crlf')
  })

  it('uses SSE `event:` line when JSON body has no `type` (proxy quirk)', async () => {
    // Some proxies keep the SSE event name but strip `type` from the data body.
    restore = installFetchMock([
      'event: content_block_delta\ndata: {"index":0,"delta":{"type":"text_delta","text":"from-event-line"}}\n\n',
      'event: message_delta\ndata: {"delta":{"stop_reason":"end_turn"}}\n\n',
    ])
    const events = await collect(agenticAsk('hi', baseConfig))
    assert.equal(textOf(events), 'from-event-line')
  })

  it('tolerates event body split across multiple TCP chunks', async () => {
    // Split in the middle of a JSON payload to verify the buffer reassembly.
    restore = installFetchMock([
      'event: content_block_delta\ndata: {"type":"content_block',
      '_delta","index":0,"delta":{"type":"text_delta","text":"split"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"-ok"}}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
    ])
    const events = await collect(agenticAsk('hi', baseConfig))
    assert.equal(textOf(events), 'split-ok')
  })

  it('skips SSE comments (`: keepalive`) and `ping` events', async () => {
    restore = installFetchMock([
      ': keepalive\n\n',
      'event: ping\ndata: {"type":"ping"}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
    ])
    const events = await collect(agenticAsk('hi', baseConfig))
    assert.equal(textOf(events), 'ok')
  })

  it('ignores thinking_delta without crashing (reasoning models)', async () => {
    restore = installFetchMock([
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"let me think..."}}\n\n',
      'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
      'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"answer"}}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
    ])
    const events = await collect(agenticAsk('hi', baseConfig))
    assert.equal(textOf(events), 'answer')
  })

  it('propagates `event: error` frames as thrown errors (not silent empty streams)', async () => {
    restore = installFetchMock([
      'event: error\ndata: {"type":"error","error":{"type":"overloaded_error","message":"upstream busy"}}\n\n',
    ])
    const events = await collect(agenticAsk('hi', baseConfig))
    const err = events.find(e => e.type === 'error')
    assert.ok(err, 'expected an error event to be surfaced')
    assert.match(err.error, /upstream busy/)
  })

  it('handles tool_use streaming with partial input_json_delta via agenticStep', async () => {
    restore = installFetchMock([
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"t1","name":"search"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"q\\":"}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"\\"hi\\"}"}}\n\n',
      'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}\n\n',
    ])
    const modAny = await import(join(__dirname, '..', 'src', 'index.js'))
    if (typeof modAny.agenticStep !== 'function') return // older build, skip
    const result = await modAny.agenticStep(
      [{ role: 'user', content: 'hi' }],
      {
        ...baseConfig,
        stream: true,
        tools: [{ name: 'search', description: 'x', input_schema: { type: 'object', properties: { q: { type: 'string' } } } }],
      },
    )
    assert.ok(Array.isArray(result.toolCalls) && result.toolCalls.length === 1, 'expected 1 tool call')
    assert.equal(result.toolCalls[0].name, 'search')
    assert.deepEqual(result.toolCalls[0].input, { q: 'hi' })
  })
})
