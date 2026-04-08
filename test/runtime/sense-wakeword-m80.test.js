import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('agentic-sense', () => ({
  createPipeline: vi.fn(() => ({ _video: null, detect: vi.fn(() => ({ faces: [], gestures: [], objects: [] })) }))
}))

const mockStream = { on: vi.fn(), pipe: vi.fn() }
const mockMicInstance = { getAudioStream: vi.fn(() => mockStream), start: vi.fn(), stop: vi.fn() }
vi.mock('mic', () => ({ default: vi.fn(() => mockMicInstance) }))

import { startWakeWordPipeline } from '../../src/runtime/sense.js'

let stopFn = null

beforeEach(() => {
  vi.clearAllMocks()
  mockMicInstance.getAudioStream.mockReturnValue(mockStream)
  mockStream.on.mockImplementation(() => mockStream)
})

afterEach(() => {
  if (stopFn) { stopFn(); stopFn = null }
})

describe('startWakeWordPipeline (M80)', () => {
  it('starts mic with correct config', async () => {
    const mic = (await import('mic')).default
    stopFn = await startWakeWordPipeline(vi.fn())
    expect(mic).toHaveBeenCalledWith({ rate: '16000', channels: '1', encoding: 'signed-integer', device: 'default' })
    expect(mockMicInstance.start).toHaveBeenCalled()
  })

  it('returns a stop function', async () => {
    stopFn = await startWakeWordPipeline(vi.fn())
    expect(typeof stopFn).toBe('function')
  })

  it('calls onWake when audio energy exceeds threshold', async () => {
    const onWake = vi.fn()
    stopFn = await startWakeWordPipeline(onWake)

    const dataCall = mockStream.on.mock.calls.find(([e]) => e === 'data')
    expect(dataCall).toBeDefined()

    const buf = Buffer.alloc(32)
    for (let i = 0; i < 32; i += 2) buf.writeInt16LE(30000, i)
    dataCall[1](buf)

    expect(onWake).toHaveBeenCalled()
  })

  it('does not call onWake for silent audio', async () => {
    const onWake = vi.fn()
    stopFn = await startWakeWordPipeline(onWake)

    const dataCall = mockStream.on.mock.calls.find(([e]) => e === 'data')
    dataCall[1](Buffer.alloc(32))

    expect(onWake).not.toHaveBeenCalled()
  })

  it('stop function stops mic instance', async () => {
    stopFn = await startWakeWordPipeline(vi.fn())
    stopFn()
    stopFn = null
    expect(mockMicInstance.stop).toHaveBeenCalled()
  })

  it('second call while active returns no-op', async () => {
    stopFn = await startWakeWordPipeline(vi.fn())
    const stop2 = await startWakeWordPipeline(vi.fn())
    expect(typeof stop2).toBe('function')
    // mic should only have been started once
    expect(mockMicInstance.start).toHaveBeenCalledTimes(1)
  })
})
