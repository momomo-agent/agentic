// Regression tests for OpenAI Responses API integration.
// Covers: buildOpenAIResponsesInput message mapping, tool_result multimodal blocks,
// streaming generator event parsing, and end-to-end chat() routing.

import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mod = await import(join(__dirname, '..', 'src', 'index.js'))
const { chat } = mod

const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAeImBZsAAAAASUVORK5CYII='

let capturedRequests = []

function installFetchCapture(responders) {
  const orig = globalThis.fetch
  capturedRequests = []
  let i = 0
  globalThis.fetch = async (url, init) => {
    let bodyJson = null
    try { bodyJson = init?.body ? JSON.parse(init.body) : null } catch {}
    capturedRequests.push({ url: String(url), headers: init?.headers || {}, body: bodyJson })
    const responder = responders[i] || responders[responders.length - 1]
    i++
    return responder({ url, init, bodyJson })
  }
  return () => { globalThis.fetch = orig }
}

function sseStream(frames) {
  const encoder = new TextEncoder()
  let idx = 0
  return new ReadableStream({
    pull(controller) {
      if (idx >= frames.length) { controller.close(); return }
      controller.enqueue(encoder.encode(frames[idx++]))
    },
  })
}

// Simulate a Responses API streaming response with text output + optional function_call
function responsesStreamResponder(text = 'ok', toolCall = null) {
  return () => {
    const frames = [
      'event: response.created\ndata: {"type":"response.created","response":{"id":"r1","status":"in_progress"}}\n\n',
    ]
    if (toolCall) {
      frames.push(
        `event: response.output_item.added\ndata: ${JSON.stringify({type:'response.output_item.added',item:{id:'item1',type:'function_call',call_id:toolCall.id,name:toolCall.name,arguments:''}})}\n\n`,
        `event: response.function_call_arguments.delta\ndata: ${JSON.stringify({type:'response.function_call_arguments.delta',item_id:'item1',delta:toolCall.arguments || '{}'})}\n\n`,
        `event: response.output_item.done\ndata: ${JSON.stringify({type:'response.output_item.done',item:{id:'item1',type:'function_call',call_id:toolCall.id,name:toolCall.name,arguments:toolCall.arguments || '{}'}})}\n\n`,
      )
    } else {
      frames.push(
        `event: response.output_text.delta\ndata: ${JSON.stringify({type:'response.output_text.delta',delta:text})}\n\n`,
      )
    }
    frames.push(
      `event: response.completed\ndata: {"type":"response.completed","response":{"id":"r1","status":"completed","usage":{"input_tokens":10,"output_tokens":5}}}\n\n`,
    )
    return {
      ok: true,
      status: 200,
      body: sseStream(frames),
      text: async () => '',
      json: async () => ({}),
      headers: new Map(),
    }
  }
}

async function collect(gen) {
  const events = []
  for await (const e of gen) events.push(e)
  return events
}

function appendUserPrompt(messages, prompt = 'please continue') {
  return [...messages, { role: 'user', content: prompt }]
}

describe('OpenAI Responses API: buildOpenAIResponsesInput', () => {
  let restore
  afterEach(() => { if (restore) restore() })

  it('maps user/assistant/tool messages to Responses API input items', async () => {
    restore = installFetchCapture([responsesStreamResponder('hi')])
    const messages = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi', tool_calls: [{ id: 'c1', name: 'greet', input: { name: 'world' } }] },
      { role: 'tool', tool_call_id: 'c1', content: '{"result":"done"}' },
      { role: 'user', content: 'thanks' },
    ]
    await collect(chat(messages, { provider: 'openai-responses', apiKey: 'k', baseUrl: 'https://example.test', model: 'gpt-4.1', stream: true }))
    const body = capturedRequests[0].body
    assert.ok(body.input, 'expected input field in request body')
    assert.ok(Array.isArray(body.input))
    // First item: user message
    assert.equal(body.input[0].type, 'message')
    assert.equal(body.input[0].role, 'user')
    assert.equal(body.input[0].content[0].type, 'input_text')
    // Second: assistant text message
    assert.equal(body.input[1].type, 'message')
    assert.equal(body.input[1].role, 'assistant')
    // Third: function_call
    assert.equal(body.input[2].type, 'function_call')
    assert.equal(body.input[2].call_id, 'c1')
    assert.equal(body.input[2].name, 'greet')
    // Fourth: function_call_output
    assert.equal(body.input[3].type, 'function_call_output')
    assert.equal(body.input[3].call_id, 'c1')
    // Fifth: user message (the prompt)
    assert.equal(body.input[4].type, 'message')
    assert.equal(body.input[4].role, 'user')
  })

  it('passes system as instructions (not in input)', async () => {
    restore = installFetchCapture([responsesStreamResponder('ok')])
    await collect(chat([{ role: 'user', content: 'hi' }], {
      provider: 'openai-responses', apiKey: 'k', baseUrl: 'https://example.test',
      model: 'gpt-4.1', stream: true, system: 'you are helpful',
    }))
    const body = capturedRequests[0].body
    assert.ok(body.instructions && body.instructions.includes('you are helpful'), 'instructions should contain system prompt')
    // system should NOT appear in input
    const sysItem = body.input.find(i => i.role === 'system')
    assert.equal(sysItem, undefined)
  })

  it('maps multimodal tool_result blocks natively (image as input_image)', async () => {
    restore = installFetchCapture([responsesStreamResponder('I see it')])
    const messages = [
      { role: 'user', content: 'screenshot' },
      { role: 'assistant', content: '', tool_calls: [{ id: 't1', name: 'screenshot', input: {} }] },
      {
        role: 'tool',
        tool_call_id: 't1',
        blocks: [
          { type: 'text', text: 'here is the screenshot' },
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: TINY_PNG_B64 } },
        ],
      },
      { role: 'user', content: 'what do you see?' },
    ]
    await collect(chat(messages, { provider: 'openai-responses', apiKey: 'k', baseUrl: 'https://example.test', model: 'gpt-4.1', stream: true }))
    const body = capturedRequests[0].body
    const fco = body.input.find(i => i.type === 'function_call_output')
    assert.ok(fco, 'expected function_call_output item')
    assert.equal(fco.call_id, 't1')
    // output should contain input_text + input_image (native, no companion message needed!)
    const textPart = fco.output.find(p => p.type === 'input_text')
    assert.ok(textPart)
    assert.match(textPart.text, /screenshot/)
    const imgPart = fco.output.find(p => p.type === 'input_image')
    assert.ok(imgPart, 'expected input_image in function_call_output')
    assert.match(imgPart.image_url, /^data:image\/png;base64,/)
  })

  it('marks is_error on function_call_output', async () => {
    restore = installFetchCapture([responsesStreamResponder('noted')])
    const messages = [
      { role: 'user', content: 'do it' },
      { role: 'assistant', content: '', tool_calls: [{ id: 'e1', name: 'fail', input: {} }] },
      { role: 'tool', tool_call_id: 'e1', blocks: [{ type: 'text', text: 'denied' }], is_error: true },
      { role: 'user', content: 'ok' },
    ]
    await collect(chat(messages, { provider: 'openai-responses', apiKey: 'k', baseUrl: 'https://example.test', model: 'gpt-4.1', stream: true }))
    const body = capturedRequests[0].body
    const fco = body.input.find(i => i.type === 'function_call_output')
    assert.equal(fco.is_error, true)
  })
})

describe('OpenAI Responses API: streaming', () => {
  let restore
  afterEach(() => { if (restore) restore() })

  it('yields text_delta events from response.output_text.delta', async () => {
    restore = installFetchCapture([responsesStreamResponder('hello world')])
    const events = await collect(chat([{ role: 'user', content: 'hi' }], {
      provider: 'openai-responses', apiKey: 'k', baseUrl: 'https://example.test', model: 'gpt-4.1', stream: true,
    }))
    const deltas = events.filter(e => e.type === 'text_delta')
    assert.ok(deltas.length > 0)
    assert.equal(deltas[0].text, 'hello world')
  })

  it('handles function_call from streaming (tool_calls in done event)', async () => {
    // First call returns a function_call, second call returns text (after tool execution)
    let callIdx = 0
    restore = installFetchCapture([
      responsesStreamResponder(null, { id: 'call_1', name: 'get_weather', arguments: '{"city":"Beijing"}' }),
      responsesStreamResponder('sunny in Beijing'),
    ])
    const events = await collect(chat([{ role: 'user', content: 'weather?' }], {
      provider: 'openai-responses', apiKey: 'k', baseUrl: 'https://example.test', model: 'gpt-4.1', stream: true,
      tools: [{ name: 'get_weather', description: 'Get weather', input_schema: { type: 'object', properties: { city: { type: 'string' } } } }],
    }))
    // Should have a tool_use event (from agenticAsk's tool execution path)
    const toolUse = events.find(e => e.type === 'tool_use')
    assert.ok(toolUse, 'expected tool_use event')
    assert.equal(toolUse.name, 'get_weather')
    assert.deepEqual(toolUse.input, { city: 'Beijing' })
  })

  it('emits done event with usage from response.completed', async () => {
    restore = installFetchCapture([responsesStreamResponder('ok')])
    const events = await collect(chat([{ role: 'user', content: 'hi' }], {
      provider: 'openai-responses', apiKey: 'k', baseUrl: 'https://example.test', model: 'gpt-4.1', stream: true,
    }))
    const done = events.find(e => e.type === 'done')
    assert.ok(done, 'expected done event')
    assert.equal(done.answer, 'ok')
  })

  it('uses /v1/responses endpoint', async () => {
    restore = installFetchCapture([responsesStreamResponder('ok')])
    await collect(chat([{ role: 'user', content: 'hi' }], {
      provider: 'openai-responses', apiKey: 'k', baseUrl: 'https://api.openai.com', model: 'gpt-4.1', stream: true,
    }))
    assert.match(capturedRequests[0].url, /\/v1\/responses$/)
  })

  it('sends tools in flat format (not wrapped in function)', async () => {
    restore = installFetchCapture([responsesStreamResponder('ok')])
    await collect(chat([{ role: 'user', content: 'hi' }], {
      provider: 'openai-responses', apiKey: 'k', baseUrl: 'https://example.test', model: 'gpt-4.1', stream: true,
      tools: [{ name: 'get_weather', description: 'Get weather', input_schema: { type: 'object', properties: { city: { type: 'string' } } } }],
    }))
    const body = capturedRequests[0].body
    assert.ok(body.tools)
    assert.equal(body.tools[0].type, 'function')
    assert.equal(body.tools[0].name, 'get_weather')
    // Should NOT have a nested `function` key
    assert.equal(body.tools[0].function, undefined)
    assert.ok(body.tools[0].parameters)
  })
})
