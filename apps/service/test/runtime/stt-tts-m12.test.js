import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/runtime/adapters/voice/openai-whisper.js', () => ({ transcribe: vi.fn(async () => 'ow') }))
vi.mock('../../src/runtime/adapters/voice/openai-tts.js',    () => ({ synthesize: vi.fn(async () => Buffer.from('ot')) }))
// Simulate sensevoice/whisper not available — throw on import to force fallback
vi.mock('../../src/runtime/adapters/voice/sensevoice.js', () => { throw new Error('sensevoice not available') })
vi.mock('../../src/runtime/adapters/voice/whisper.js', () => { throw new Error('whisper not available') })
vi.mock('../../src/runtime/adapters/voice/macos-say.js', () => { throw new Error('macos-say not available') })
vi.mock('../../src/runtime/adapters/voice/kokoro.js', () => { throw new Error('kokoro not available') })

let profileData = { stt: { provider: 'default' }, tts: { provider: 'default' } }
vi.mock('../../src/detector/profiles.js', () => ({
  getProfile: vi.fn(async () => profileData),
}))
vi.mock('../../src/detector/hardware.js', () => ({ detect: vi.fn(async () => ({})) }))

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

  it('DBB-002: unknown provider falls back to openai-whisper', async () => {
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

  it('DBB-003: unknown provider falls back to openai-tts', async () => {
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
