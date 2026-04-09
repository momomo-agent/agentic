import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- TTS mocks (local adapter paths) ---
vi.mock('../../src/runtime/adapters/voice/openai-tts.js', () => ({ synthesize: vi.fn(async () => Buffer.from('openai-tts')) }))

// --- STT mocks (local adapter paths) ---
vi.mock('../../src/runtime/adapters/voice/openai-whisper.js', () => ({ transcribe: vi.fn(async () => 'ow') }))

let profileData = { tts: { provider: 'default' }, llm: { model: 'gemma3:1b' }, fallback: { provider: 'openai', model: 'gpt-4o-mini' } }

vi.mock('../../src/detector/profiles.js', () => ({
  getProfile:   vi.fn(async () => profileData),
  watchProfiles: vi.fn(),
}))
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn(async () => ({})),
}))

function ndjsonStream(objects) {
  const text = objects.map(o => JSON.stringify(o)).join('\n') + '\n'
  return new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close() } })
}
function sseStream(lines) {
  const text = lines.join('\n') + '\n'
  return new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close() } })
}
async function collect(gen) {
  const out = []
  for await (const c of gen) out.push(c)
  return out
}

// ─── TTS tests ───────────────────────────────────────────────────────────────
describe('m38: tts.js synthesize()', () => {
  beforeEach(() => { vi.resetModules() })

  it('throws "not initialized" before init()', async () => {
    const { synthesize } = await import('../../src/runtime/tts.js')
    await expect(synthesize('hello')).rejects.toThrow('not initialized')
  })

  it('valid text → Buffer after init()', async () => {
    profileData = { tts: { provider: 'default' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    await init()
    const buf = await synthesize('hello')
    expect(Buffer.isBuffer(buf)).toBe(true)
  })

  it('empty string → EMPTY_TEXT error', async () => {
    profileData = { tts: { provider: 'default' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    await init()
    const err = await synthesize('').catch(e => e)
    expect(err.code).toBe('EMPTY_TEXT')
  })

  it('whitespace-only → EMPTY_TEXT error', async () => {
    profileData = { tts: { provider: 'default' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    await init()
    const err = await synthesize('   ').catch(e => e)
    expect(err.code).toBe('EMPTY_TEXT')
  })

  it('unknown provider falls back to openai-tts', async () => {
    profileData = { tts: { provider: 'unknown-tts' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    await init()
    const buf = await synthesize('hi')
    expect(buf.toString()).toBe('openai-tts')
  })

  it('piper provider falls back to openai-tts (adapter not installed)', async () => {
    profileData = { tts: { provider: 'piper' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    await init()
    const buf = await synthesize('hi')
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.toString()).toBe('openai-tts')
  })
})

// ─── LLM tests ───────────────────────────────────────────────────────────────
describe('m38: llm.js chat()', () => {
  let origFetch
  beforeEach(() => {
    vi.resetModules()
    origFetch = global.fetch
    profileData = { llm: { model: 'gemma3:1b' }, fallback: { provider: 'openai', model: 'gpt-4o-mini' } }
    delete process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
  })
  afterEach(() => { global.fetch = origFetch })

  it('chat is an async generator', async () => {
    global.fetch = async () => { throw new Error('ECONNREFUSED') }
    const { chat } = await import('../../src/runtime/llm.js')
    const gen = chat([])
    expect(typeof gen[Symbol.asyncIterator]).toBe('function')
    await gen.return()
  })

  it('Ollama up: yields content chunks', async () => {
    global.fetch = async (url) => {
      if (url.includes('11434')) return { ok: true, body: ndjsonStream([
        { message: { content: 'hi' }, done: false },
        { message: { content: '!' }, done: true }
      ])}
      throw new Error('unexpected: ' + url)
    }
    const { chat } = await import('../../src/runtime/llm.js')
    const chunks = await collect(chat([{ role: 'user', content: 'hey' }]))
    const content = chunks.filter(c => c.type === 'content')
    expect(content.map(c => c.content).join('')).toBe('hi!')
    expect('done' in content[0]).toBe(true)
  })

  it('Ollama down: first chunk is meta with provider=cloud', async () => {
    process.env.OPENAI_API_KEY = 'test'
    global.fetch = async (url) => {
      if (url.includes('11434')) throw new Error('ECONNREFUSED')
      if (url.includes('openai')) return { ok: true, body: sseStream([
        'data: {"choices":[{"delta":{"content":"ok"}}]}',
        'data: [DONE]'
      ])}
      throw new Error('unexpected: ' + url)
    }
    const { chat } = await import('../../src/runtime/llm.js')
    const chunks = await collect(chat([{ role: 'user', content: 'hi' }]))
    expect(chunks[0]?.type).toBe('meta')
    expect(chunks[0]?.provider).toBe('cloud')
  })

  it('empty messages: no crash', async () => {
    global.fetch = async (url) => {
      if (url.includes('11434')) return { ok: true, body: ndjsonStream([{ message: { content: 'ok' }, done: true }]) }
      throw new Error('unexpected: ' + url)
    }
    const { chat } = await import('../../src/runtime/llm.js')
    const chunks = await collect(chat([]))
    expect(Array.isArray(chunks)).toBe(true)
  })

  it('missing API key: throws mentioning provider', async () => {
    global.fetch = async (url) => {
      if (url.includes('11434')) throw new Error('ECONNREFUSED')
      throw new Error('unexpected: ' + url)
    }
    const { chat } = await import('../../src/runtime/llm.js')
    const err = await collect(chat([{ role: 'user', content: 'hi' }])).catch(e => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.message.toLowerCase()).toMatch(/openai|api_key/)
  })

  it('unknown fallback provider: throws', async () => {
    profileData = { llm: { model: 'gemma3:1b' }, fallback: { provider: 'unknown', model: 'x' } }
    process.env.OPENAI_API_KEY = 'x'
    global.fetch = async (url) => {
      if (url.includes('11434')) throw new Error('ECONNREFUSED')
      throw new Error('unexpected: ' + url)
    }
    const { chat } = await import('../../src/runtime/llm.js')
    const err = await collect(chat([{ role: 'user', content: 'hi' }])).catch(e => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toMatch(/unsupported/i)
  })
})
