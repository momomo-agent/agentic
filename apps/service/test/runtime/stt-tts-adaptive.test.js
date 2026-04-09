import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/runtime/adapters/voice/openai-whisper.js', () => ({ transcribe: vi.fn(async () => 'openai-whisper result') }))
vi.mock('../../src/runtime/adapters/voice/openai-tts.js',    () => ({ synthesize: vi.fn(async () => Buffer.from('openai-tts')) }))
vi.mock('../../src/runtime/adapters/voice/kokoro.js',        () => ({ synthesize: vi.fn(async () => Buffer.from('kokoro')) }))
vi.mock('../../src/runtime/adapters/voice/piper.js',         () => ({ synthesize: vi.fn(async () => Buffer.from('piper')) }))

let profileData = { stt: { provider: 'default' }, tts: { provider: 'default' } }
vi.mock('../../src/detector/profiles.js', () => ({
  getProfile: vi.fn(async () => profileData),
}))
vi.mock('../../src/detector/hardware.js', () => ({ detect: vi.fn(async () => ({})) }))

describe('STT adaptive (task-1775498249905)', () => {
  beforeEach(() => { vi.resetModules() })

  it('DBB-005: sensevoice provider falls back to openai-whisper (adapter not installed)', async () => {
    profileData = { stt: { provider: 'sensevoice' }, tts: { provider: 'default' } }
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    const result = await transcribe(Buffer.from('audio'))
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('whisper provider falls back to openai-whisper (adapter not installed)', async () => {
    profileData = { stt: { provider: 'whisper' }, tts: { provider: 'default' } }
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    const result = await transcribe(Buffer.from('audio'))
    expect(typeof result).toBe('string')
  })

  it('DBB-006: unknown provider falls back to openai-whisper', async () => {
    profileData = { stt: { provider: 'unknown' }, tts: { provider: 'default' } }
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    const result = await transcribe(Buffer.from('audio'))
    expect(result).toBe('openai-whisper result')
  })

  it('profile load failure falls back to default', async () => {
    const { getProfile } = await import('../../src/detector/profiles.js')
    getProfile.mockRejectedValueOnce(new Error('network'))
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    const result = await transcribe(Buffer.from('audio'))
    expect(result).toBe('openai-whisper result')
  })

  it('transcribe before init throws', async () => {
    const { transcribe } = await import('../../src/runtime/stt.js')
    await expect(transcribe(Buffer.from('audio'))).rejects.toThrow('not initialized')
  })
})

describe('TTS adaptive (task-1775498249905)', () => {
  beforeEach(() => { vi.resetModules() })

  it('DBB-007: tts.js has init() export', async () => {
    const tts = await import('../../src/runtime/tts.js')
    expect(typeof tts.init).toBe('function')
  })

  it('DBB-007: kokoro provider falls back to openai-tts (adapter not installed)', async () => {
    profileData = { stt: { provider: 'default' }, tts: { provider: 'kokoro' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    await init()
    const result = await synthesize('hello')
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.toString()).toBe('openai-tts')
  })

  it('DBB-008: unknown tts provider falls back to openai-tts', async () => {
    profileData = { stt: { provider: 'default' }, tts: { provider: 'unknown' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    await init()
    const result = await synthesize('hello')
    expect(result.toString()).toBe('openai-tts')
  })
})
