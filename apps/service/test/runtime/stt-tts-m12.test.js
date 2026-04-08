import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('agentic-voice/sensevoice', () => ({ transcribe: vi.fn(async () => 'sv') }))
vi.mock('agentic-voice/whisper',    () => ({ transcribe: vi.fn(async () => 'wh') }))
vi.mock('agentic-voice/openai-whisper', () => ({ transcribe: vi.fn(async () => 'ow') }))
vi.mock('agentic-voice/kokoro',  () => ({ synthesize: vi.fn(async () => Buffer.from('ko')) }))
vi.mock('agentic-voice/piper',   () => ({ synthesize: vi.fn(async () => Buffer.from('pi')) }))
vi.mock('agentic-voice/openai-tts', () => ({ synthesize: vi.fn(async () => Buffer.from('ot')) }))

let profileData = { stt: { provider: 'default' }, tts: { provider: 'default' } }
vi.mock('../../src/detector/profiles.js', () => ({
  getProfile: vi.fn(async () => profileData),
}))

describe('STT completeness (task-1775500434960)', () => {
  beforeEach(() => { vi.resetModules() })

  it('DBB-002: transcribe(validBuffer) returns string', async () => {
    profileData = { stt: { provider: 'default' }, tts: { provider: 'default' } }
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    const result = await transcribe(Buffer.from('audio'))
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('DBB-002: local adapter import failure falls back to openai-whisper', async () => {
    vi.doMock('agentic-voice/sensevoice', () => { throw new Error('not found') })
    profileData = { stt: { provider: 'sensevoice' }, tts: { provider: 'default' } }
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    const result = await transcribe(Buffer.from('audio'))
    expect(result).toBe('ow')
  })

  it('DBB-002: transcribe(emptyBuffer) rejects with EMPTY_AUDIO', async () => {
    profileData = { stt: { provider: 'default' }, tts: { provider: 'default' } }
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    await expect(transcribe(Buffer.alloc(0))).rejects.toMatchObject({ code: 'EMPTY_AUDIO' })
  })
})

describe('TTS completeness (task-1775500434960)', () => {
  beforeEach(() => { vi.resetModules() })

  it('DBB-003: synthesize(text) returns Buffer', async () => {
    profileData = { stt: { provider: 'default' }, tts: { provider: 'default' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    await init()
    const result = await synthesize('hello')
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('DBB-003: local adapter import failure falls back to openai-tts', async () => {
    vi.doMock('agentic-voice/kokoro', () => { throw new Error('not found') })
    profileData = { stt: { provider: 'default' }, tts: { provider: 'kokoro' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    await init()
    const result = await synthesize('hello')
    expect(result.toString()).toBe('ot')
  })

  it('DBB-003: synthesize("") rejects with EMPTY_TEXT', async () => {
    profileData = { stt: { provider: 'default' }, tts: { provider: 'default' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    await init()
    await expect(synthesize('')).rejects.toMatchObject({ code: 'EMPTY_TEXT' })
  })
})
