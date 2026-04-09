import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../src/runtime/adapters/sense.js', () => ({
  createPipeline: vi.fn(() => ({ _video: null, detect: vi.fn(() => ({ faces: [], gestures: [], objects: [] })) }))
}))

// Mock child_process so sox check passes
vi.mock('node:child_process', () => ({
  execSync: vi.fn(() => '/usr/bin/sox'),
}))

const mockStream = { on: vi.fn(), pipe: vi.fn() }
const mockRecorder = { stream: vi.fn(() => mockStream), stop: vi.fn(), process: null }
const mockRecord = { record: vi.fn(() => mockRecorder) }
vi.mock('node-record-lpcm16', () => ({ default: mockRecord }))

import { startWakeWordPipeline, stopWakeWordPipeline } from '../../src/runtime/sense.js'

beforeEach(() => {
  vi.clearAllMocks()
  mockRecorder.stream.mockReturnValue(mockStream)
  mockStream.on.mockImplementation(() => mockStream)
  stopWakeWordPipeline()
})

afterEach(() => {
  stopWakeWordPipeline()
})

describe('startWakeWordPipeline (M80)', () => {
  it('starts recorder with correct config', async () => {
    await startWakeWordPipeline(vi.fn())
    expect(mockRecord.record).toHaveBeenCalledWith({ sampleRate: 16000, channels: 1 })
  })

  it('stopWakeWordPipeline is a function', () => {
    expect(typeof stopWakeWordPipeline).toBe('function')
  })

  it('calls onWake when audio energy exceeds threshold', async () => {
    const onWake = vi.fn()
    await startWakeWordPipeline(onWake)

    const dataCall = mockStream.on.mock.calls.find(([e]) => e === 'data')
    expect(dataCall).toBeDefined()

    const buf = Buffer.alloc(32)
    for (let i = 0; i < 32; i += 2) buf.writeInt16LE(30000, i)
    dataCall[1](buf)

    expect(onWake).toHaveBeenCalled()
  })

  it('does not call onWake for silent audio', async () => {
    const onWake = vi.fn()
    await startWakeWordPipeline(onWake)

    const dataCall = mockStream.on.mock.calls.find(([e]) => e === 'data')
    dataCall[1](Buffer.alloc(32))

    expect(onWake).not.toHaveBeenCalled()
  })

  it('stopWakeWordPipeline stops recorder instance', async () => {
    await startWakeWordPipeline(vi.fn())
    stopWakeWordPipeline()
    expect(mockRecorder.stop).toHaveBeenCalled()
  })

  it('second call while active stops previous and starts new recorder', async () => {
    await startWakeWordPipeline(vi.fn())
    await startWakeWordPipeline(vi.fn())
    // first call stops old recorder, second starts new one
    expect(mockRecord.record).toHaveBeenCalledTimes(2)
  })
})
