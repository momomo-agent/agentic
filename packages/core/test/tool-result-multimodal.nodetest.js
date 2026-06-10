// Regression tests for multimodal tool results.
// Covers: text / image (base64 + url + path) / document / audio / video / file /
// is_error / size limits / OpenAI + Anthropic mapping, plus companion-message
// emission for blocks Anthropic disallows inside tool_result.

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mod = await import(join(__dirname, '..', 'src', 'index.js'))
const { chat, normalizeToolResultBlocks, buildToolResultsAsync } = mod

// A tiny 1x1 PNG
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

// A minimal single-turn Anthropic SSE that produces one text_delta and end_turn.
function anthropicStreamResponder(text = 'ok') {
  return () => ({
    ok: true,
    status: 200,
    body: sseStream([
      'event: message_start\ndata: {"type":"message_start","message":{"id":"m","usage":{"input_tokens":1}}}\n\n',
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
      `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":${JSON.stringify(text)}}}\n\n`,
      'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":1}}\n\n',
    ]),
    text: async () => '',
    json: async () => ({}),
    headers: new Map(),
  })
}

function openaiStreamResponder(text = 'ok') {
  return () => ({
    ok: true,
    status: 200,
    body: sseStream([
      `data: {"choices":[{"delta":{"content":${JSON.stringify(text)}}}]}\n\n`,
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ]),
    text: async () => '',
    json: async () => ({}),
    headers: new Map(),
  })
}

async function collect(gen) {
  const events = []
  for await (const e of gen) events.push(e)
  return events
}

// Build a request by calling chat() with an assistant-authored final user message appended.
// The SUT we actually care about is the provider message-builder, so we add a
// trailing user message ("please continue") so messages.length-1 is a plain user
// message and the tool history precedes it.
function appendUserPrompt(messages, prompt = 'please continue') {
  return [...messages, { role: 'user', content: prompt }]
}

describe('normalizeToolResultBlocks', () => {
  it('normalises a bare string', async () => {
    const { blocks, is_error } = await normalizeToolResultBlocks('hello')
    assert.equal(is_error, false)
    assert.deepEqual(blocks, [{ type: 'text', text: 'hello' }])
  })

  it('normalises an { error } shape with is_error', async () => {
    const { blocks, is_error } = await normalizeToolResultBlocks({ error: 'nope' })
    assert.equal(is_error, true)
    assert.equal(blocks[0].type, 'text')
    assert.match(blocks[0].text, /nope/)
  })

  it('passes through structured content arrays', async () => {
    const { blocks } = await normalizeToolResultBlocks({
      content: [
        { type: 'text', text: 'here is a screenshot' },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: TINY_PNG_B64 } },
      ],
    })
    assert.equal(blocks.length, 2)
    assert.equal(blocks[1].type, 'image')
    assert.equal(blocks[1].source.media_type, 'image/png')
  })

  it('accepts legacy { image_base64, media_type } shorthand', async () => {
    const { blocks } = await normalizeToolResultBlocks({ image_base64: TINY_PNG_B64, media_type: 'image/png' })
    assert.equal(blocks[0].type, 'image')
    assert.equal(blocks[0].source.data, TINY_PNG_B64)
  })

  it('accepts legacy { image_url } shorthand', async () => {
    const { blocks } = await normalizeToolResultBlocks({ image_url: 'https://example.test/pic.png' })
    assert.equal(blocks[0].type, 'image')
    assert.equal(blocks[0].source.type, 'url')
  })

  it('accepts { image: { data, media_type }, output } shorthand (read_image convention)', async () => {
    const { blocks } = await normalizeToolResultBlocks({
      image: { data: TINY_PNG_B64, media_type: 'image/png' },
      output: '1x1 pixel PNG',
    })
    assert.equal(blocks.length, 2)
    assert.equal(blocks[0].type, 'text')
    assert.equal(blocks[0].text, '1x1 pixel PNG')
    assert.equal(blocks[1].type, 'image')
    assert.equal(blocks[1].source.media_type, 'image/png')
    assert.equal(blocks[1].source.data, TINY_PNG_B64)
  })

  it('accepts { image: { data } } without output', async () => {
    const { blocks } = await normalizeToolResultBlocks({ image: { data: TINY_PNG_B64 } })
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].type, 'image')
    assert.equal(blocks[0].source.media_type, 'image/png')
  })

  it('reads an on-disk file as base64 (image)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'agentic-toolresult-'))
    const p = join(dir, 'pic.png')
    writeFileSync(p, Buffer.from(TINY_PNG_B64, 'base64'))
    const { blocks } = await normalizeToolResultBlocks({ content: [{ type: 'image', source: { type: 'path', path: p } }] })
    assert.equal(blocks[0].type, 'image')
    assert.equal(blocks[0].source.type, 'base64')
    assert.equal(blocks[0].source.media_type, 'image/png')
    assert.ok(blocks[0].source.data.length > 10)
  })

  it('inlines small text files as text blocks', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'agentic-toolresult-'))
    const p = join(dir, 'note.txt')
    writeFileSync(p, 'hello from disk')
    const { blocks } = await normalizeToolResultBlocks({ content: [{ type: 'file', source: { type: 'path', path: p } }] })
    // text/* files get inlined as a text block with file metadata prefix
    assert.equal(blocks[0].type, 'text')
    assert.match(blocks[0].text, /hello from disk/)
  })

  it('omits images that exceed the size limit (explicit)', async () => {
    // fabricate a "large" base64 string (~2MB decoded)
    const huge = 'A'.repeat(3_000_000)
    const { blocks } = await normalizeToolResultBlocks({
      content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: huge } }],
    }, { limits: { image: 1_000_000 } })
    assert.equal(blocks[0].type, 'text')
    assert.match(blocks[0].text, /omitted/)
  })

  it('stops at totalPerResult budget', async () => {
    const mid = 'A'.repeat(800_000) // ~600KB decoded
    const { blocks } = await normalizeToolResultBlocks({
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: mid } },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: mid } },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: mid } },
      ],
    }, { limits: { image: 1_000_000, totalPerResult: 1_000_000 } })
    const truncated = blocks.find(b => b.type === 'text' && /truncated/.test(b.text))
    assert.ok(truncated, 'expected a truncation notice')
  })
})

describe('buildToolResultsAsync', () => {
  it('builds tool messages with blocks + is_error + content fallback', async () => {
    const calls = [{ id: 't1', name: 'screenshot' }, { id: 't2', name: 'bad' }]
    const results = [
      { output: { content: [{ type: 'text', text: 'shot' }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: TINY_PNG_B64 } }] } },
      { error: 'permission denied' },
    ]
    const msgs = await buildToolResultsAsync(calls, results)
    assert.equal(msgs.length, 2)
    assert.equal(msgs[0].role, 'tool')
    assert.equal(msgs[0].tool_call_id, 't1')
    assert.equal(msgs[0].blocks.length, 2)
    assert.equal(msgs[0].is_error, false)
    assert.equal(msgs[1].is_error, true)
    assert.match(msgs[1].blocks[0].text, /permission denied/)
  })
})

describe('Anthropic provider mapping for tool results', () => {
  let restore
  afterEach(() => { if (restore) restore() })

  it('emits tool_result.content as [text, image] and preserves is_error', async () => {
    restore = installFetchCapture([anthropicStreamResponder('got it')])
    const messages = [
      { role: 'user', content: 'take a screenshot' },
      { role: 'assistant', content: '', tool_calls: [{ id: 't1', name: 'screenshot', input: {} }] },
      {
        role: 'tool',
        tool_call_id: 't1',
        blocks: [
          { type: 'text', text: 'here it is' },
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: TINY_PNG_B64 } },
        ],
        is_error: false,
      },
    ]
    await collect(chat(appendUserPrompt(messages), { provider: 'anthropic', apiKey: 'k', baseUrl: 'https://example.test', model: 'claude-test', stream: true }))
    const body = capturedRequests[0].body
    const toolUserMsg = body.messages.find(m => m.role === 'user' && Array.isArray(m.content) && m.content[0]?.type === 'tool_result')
    assert.ok(toolUserMsg, 'expected a user message carrying tool_result')
    const tr = toolUserMsg.content[0]
    assert.equal(tr.type, 'tool_result')
    assert.equal(tr.tool_use_id, 't1')
    assert.equal(tr.content[0].type, 'text')
    assert.equal(tr.content[1].type, 'image')
    assert.equal(tr.content[1].source.media_type, 'image/png')
  })

  it('sets is_error:true on error tool results', async () => {
    restore = installFetchCapture([anthropicStreamResponder('noted')])
    const messages = [
      { role: 'user', content: 'do it' },
      { role: 'assistant', content: '', tool_calls: [{ id: 'e1', name: 'fail', input: {} }] },
      {
        role: 'tool',
        tool_call_id: 'e1',
        blocks: [{ type: 'text', text: 'permission denied' }],
        is_error: true,
      },
    ]
    await collect(chat(appendUserPrompt(messages), { provider: 'anthropic', apiKey: 'k', baseUrl: 'https://example.test', model: 'claude-test', stream: true }))
    const body = capturedRequests[0].body
    const tr = body.messages.find(m => m.role === 'user' && Array.isArray(m.content) && m.content[0]?.type === 'tool_result').content[0]
    assert.equal(tr.is_error, true)
  })

  it('moves document blocks to a companion user message (tool_result cannot host documents)', async () => {
    restore = installFetchCapture([anthropicStreamResponder('ok')])
    const messages = [
      { role: 'user', content: 'fetch a pdf' },
      { role: 'assistant', content: '', tool_calls: [{ id: 't1', name: 'pdf', input: {} }] },
      {
        role: 'tool',
        tool_call_id: 't1',
        blocks: [
          { type: 'text', text: 'here is a pdf summary' },
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0xLjQK' } },
        ],
      },
    ]
    await collect(chat(appendUserPrompt(messages), { provider: 'anthropic', apiKey: 'k', baseUrl: 'https://example.test', model: 'claude-test', stream: true }))
    const body = capturedRequests[0].body
    const msgs = body.messages
    const toolUserIdx = msgs.findIndex(m => Array.isArray(m.content) && m.content[0]?.type === 'tool_result')
    assert.ok(toolUserIdx >= 0)
    // The next message should be a companion user message containing a document block.
    const companion = msgs[toolUserIdx + 1]
    assert.ok(companion, 'expected companion user message after tool_result')
    assert.equal(companion.role, 'user')
    const doc = companion.content.find(c => c.type === 'document')
    assert.ok(doc, 'expected document block in companion user message')
    assert.equal(doc.source.media_type, 'application/pdf')
  })

  it('turns audio/video/file blocks into text placeholders (Anthropic has no native slot)', async () => {
    restore = installFetchCapture([anthropicStreamResponder('ok')])
    const messages = [
      { role: 'user', content: 'fetch audio' },
      { role: 'assistant', content: '', tool_calls: [{ id: 't1', name: 'rec', input: {} }] },
      {
        role: 'tool',
        tool_call_id: 't1',
        blocks: [
          { type: 'text', text: 'recording' },
          { type: 'audio', source: { type: 'url', url: 'https://example.test/a.mp3', media_type: 'audio/mpeg' } },
          { type: 'video', source: { type: 'url', url: 'https://example.test/v.mp4', media_type: 'video/mp4' } },
          { type: 'file',  source: { type: 'url', url: 'https://example.test/x.bin', media_type: 'application/octet-stream' } },
        ],
      },
    ]
    await collect(chat(appendUserPrompt(messages), { provider: 'anthropic', apiKey: 'k', baseUrl: 'https://example.test', model: 'claude-test', stream: true }))
    const body = capturedRequests[0].body
    const tr = body.messages.find(m => Array.isArray(m.content) && m.content[0]?.type === 'tool_result').content[0]
    // audio/video/file all collapse to [text] placeholders inside tool_result.content
    const kinds = tr.content.map(b => b.type)
    assert.ok(kinds.every(k => k === 'text'), `unexpected block types in tool_result: ${JSON.stringify(kinds)}`)
    const joined = tr.content.map(b => b.text).join(' | ')
    assert.match(joined, /\[audio .*a\.mp3/)
    assert.match(joined, /\[video .*v\.mp4/)
    assert.match(joined, /\[file .*x\.bin/)
  })
})

describe('OpenAI provider mapping for tool results', () => {
  let restore
  afterEach(() => { if (restore) restore() })

  it('splits block tool result into tool-role text + follow-up user image parts', async () => {
    restore = installFetchCapture([openaiStreamResponder('got it')])
    const messages = [
      { role: 'user', content: 'take a screenshot' },
      { role: 'assistant', content: '', tool_calls: [{ id: 't1', name: 'screenshot', input: {} }] },
      {
        role: 'tool',
        tool_call_id: 't1',
        blocks: [
          { type: 'text', text: 'here it is' },
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: TINY_PNG_B64 } },
        ],
      },
    ]
    await collect(chat(appendUserPrompt(messages), { provider: 'openai', apiKey: 'k', baseUrl: 'https://example.test', model: 'gpt-test', stream: true }))
    const body = capturedRequests[0].body
    const assistantMsg = body.messages.find(m => m.role === 'assistant' && Array.isArray(m.tool_calls))
    assert.equal(assistantMsg.tool_calls[0].type, 'function')
    assert.equal(assistantMsg.tool_calls[0].function.name, 'screenshot')
    assert.equal(assistantMsg.tool_calls[0].function.arguments, '{}')
    const toolIdx = body.messages.findIndex(m => m.role === 'tool' && m.tool_call_id === 't1')
    assert.ok(toolIdx >= 0, 'expected a tool-role message')
    assert.equal(typeof body.messages[toolIdx].content, 'string', 'tool role content must be string for Chat Completions')
    const followup = body.messages[toolIdx + 1]
    assert.ok(followup, 'expected follow-up user message for image parts')
    assert.equal(followup.role, 'user')
    const imagePart = followup.content.find(c => c.type === 'image_url')
    assert.ok(imagePart, 'expected image_url part in follow-up user message')
    assert.match(imagePart.image_url.url, /^data:image\/png;base64,/)
  })

  it('marks error results with a tool-role [tool error] prefix', async () => {
    restore = installFetchCapture([openaiStreamResponder('noted')])
    const messages = [
      { role: 'user', content: 'do it' },
      { role: 'assistant', content: '', tool_calls: [{ id: 'e1', name: 'fail', input: {} }] },
      {
        role: 'tool',
        tool_call_id: 'e1',
        blocks: [{ type: 'text', text: 'permission denied' }],
        is_error: true,
      },
    ]
    await collect(chat(appendUserPrompt(messages), { provider: 'openai', apiKey: 'k', baseUrl: 'https://example.test', model: 'gpt-test', stream: true }))
    const body = capturedRequests[0].body
    const toolMsg = body.messages.find(m => m.role === 'tool' && m.tool_call_id === 'e1')
    assert.match(toolMsg.content, /\[tool error\]/)
    assert.match(toolMsg.content, /permission denied/)
  })
})
