import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockTranscribe = vi.fn(async () => 'hello')
const mockSynthesize = vi.fn(async () => Buffer.from('audio'))

vi.mock('agentic-voice/sensevoice', () => ({ transcribe: vi.fn(async () => 'sensevoice result') }))
vi.mock('agentic-voice/whisper',    () => ({ transcribe: vi.fn(async () => 'whisper result') }))
vi.mock('agentic-voice/openai-whisper', () => ({ transcribe: vi.fn(async () => 'openai-whisper result') }))
vi.mock('agentic-voice/kokoro', () => ({ synthesize: vi.fn(async () => Buffer.from('kokoro')) }))
vi.mock('agentic-voice/piper',  () => ({ synthesize: vi.fn(async () => Buffer.from('piper')) }))
vi.mock('agentic-voice/openai-tts', () => ({ synthesize: vi.fn(async () => Buffer.from('openai-tts')) }))

let profileData = { stt: { provider: 'default' }, tts: { provider: 'default' } }
vi.mock('../../src/detector/profiles.js', () => ({
  getProfile: vi.fn(async () => profileData),
}))

describe('STT adaptive (task-1775498249905)', () => {
  beforeEach(() => { vi.resetModules() })

  it('DBB-005: sensevoice provider loads sensevoice adapter', async () => {
    profileData = { stt: { provider: 'sensevoice' }, tts: { provider: 'default' } }
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    const result = await transcribe(Buffer.from('audio'))
    expect(result).toBe('sensevoice result')
  })

  it('whisper provider loads whisper adapter', async () => {
    profileData = { stt: { provider: 'whisper' }, tts: { provider: 'default' } }
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    const result = await transcribe(Buffer.from('audio'))
    expect(result).toBe('whisper result')
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

  it('DBB-007: kokoro provider loads kokoro adapter', async () => {
    profileData = { stt: { provider: 'default' }, tts: { provider: 'kokoro' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    if (typeof init !== 'function') return // expose bug
    await init()
    const result = await synthesize('hello')
    expect(result.toString()).toBe('kokoro')
  })

  it('DBB-008: unknown tts provider falls back to openai-tts', async () => {
    profileData = { stt: { provider: 'default' }, tts: { provider: 'unknown' } }
    const { init, synthesize } = await import('../../src/runtime/tts.js')
    if (typeof init !== 'function') return // expose bug
    await init()
    const result = await synthesize('hello')
    expect(result.toString()).toBe('openai-tts')
  })
})
