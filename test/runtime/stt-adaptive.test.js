import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSenseVoice = { transcribe: vi.fn(async () => 'sensevoice result') }
const mockWhisper    = { transcribe: vi.fn(async () => 'whisper result') }
const mockOpenAI     = { transcribe: vi.fn(async () => 'openai result') }

vi.mock('agentic-voice/sensevoice',    () => ({ default: mockSenseVoice, ...mockSenseVoice }))
vi.mock('agentic-voice/whisper',       () => ({ default: mockWhisper,    ...mockWhisper }))
vi.mock('agentic-voice/openai-whisper',() => ({ default: mockOpenAI,     ...mockOpenAI }))

const mockGetProfile = vi.fn()
vi.mock('../../src/detector/profiles.js', () => ({ getProfile: mockGetProfile }))

const audio = Buffer.from('audio')

describe('stt adaptive selection (DBB-005, DBB-006)', () => {
  beforeEach(() => { vi.resetModules() })

  it('DBB-005: sensevoice provider → uses sensevoice adapter', async () => {
    mockGetProfile.mockResolvedValue({ stt: { provider: 'sensevoice' } })
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    await transcribe(audio)
    expect(mockSenseVoice.transcribe).toHaveBeenCalledWith(audio)
  })

  it('DBB-005: whisper provider → uses whisper adapter', async () => {
    mockGetProfile.mockResolvedValue({ stt: { provider: 'whisper' } })
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    await transcribe(audio)
    expect(mockWhisper.transcribe).toHaveBeenCalledWith(audio)
  })

  it('DBB-006: unknown provider → falls back to openai-whisper', async () => {
    mockGetProfile.mockResolvedValue({ stt: { provider: 'unknown' } })
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    await transcribe(audio)
    expect(mockOpenAI.transcribe).toHaveBeenCalledWith(audio)
  })

  it('DBB-006: profile load failure → falls back to openai-whisper', async () => {
    mockGetProfile.mockRejectedValue(new Error('network'))
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    await transcribe(audio)
    expect(mockOpenAI.transcribe).toHaveBeenCalledWith(audio)
  })

  it('throws if transcribe called before init', async () => {
    mockGetProfile.mockResolvedValue({ stt: { provider: 'default' } })
    const { transcribe } = await import('../../src/runtime/stt.js')
    await expect(transcribe(audio)).rejects.toThrow('not initialized')
  })

  it('throws EMPTY_AUDIO for empty buffer', async () => {
    mockGetProfile.mockResolvedValue({ stt: { provider: 'default' } })
    const { init, transcribe } = await import('../../src/runtime/stt.js')
    await init()
    const err = await transcribe(Buffer.alloc(0)).catch(e => e)
    expect(err.code).toBe('EMPTY_AUDIO')
  })
})
