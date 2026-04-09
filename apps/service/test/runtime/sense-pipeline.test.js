import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockDetect = vi.fn()
const mockPipeline = { detect: mockDetect, _video: null }

vi.mock('../../src/runtime/adapters/sense.js', () => ({
  createPipeline: vi.fn(async () => mockPipeline)
}))

const { init, on, start, stop } = await import('../../src/runtime/sense.js')

function makeVideo(readyState = 4) {
  return { readyState }
}

describe('sense pipeline (DBB-003, DBB-004)', () => {
  beforeEach(() => {
    mockDetect.mockReset()
    stop()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('DBB-003: face_detected event emitted with boundingBox', async () => {
    await init(makeVideo())
    mockDetect.mockReturnValue({ faces: [{ boundingBox: { x:0,y:0,w:10,h:10 } }], gestures: [], objects: [] })
    const handler = vi.fn()
    on('face_detected', handler)
    start()
    vi.advanceTimersByTime(20)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'face_detected',
      data: { boundingBox: { x:0,y:0,w:10,h:10 } }
    }))
  })

  it('DBB-004: gesture_detected event emitted', async () => {
    await init(makeVideo())
    mockDetect.mockReturnValue({ faces: [], gestures: [{ gesture: 'wave' }], objects: [] })
    const handler = vi.fn()
    on('gesture_detected', handler)
    start()
    vi.advanceTimersByTime(20)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'gesture_detected',
      data: { gesture: 'wave' }
    }))
  })

  it('object confidence > 0.5 → object_detected emitted', async () => {
    await init(makeVideo())
    mockDetect.mockReturnValue({ faces: [], gestures: [], objects: [{ label: 'cup', confidence: 0.8 }] })
    const handler = vi.fn()
    on('object_detected', handler)
    start()
    vi.advanceTimersByTime(20)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'object_detected' }))
  })

  it('object confidence <= 0.5 → no event', async () => {
    await init(makeVideo())
    mockDetect.mockReturnValue({ faces: [], gestures: [], objects: [{ label: 'cup', confidence: 0.4 }] })
    const handler = vi.fn()
    on('object_detected', handler)
    start()
    vi.advanceTimersByTime(20)
    expect(handler).not.toHaveBeenCalled()
  })

  it('video not ready → skips frame', async () => {
    await init(makeVideo(1))
    mockDetect.mockReturnValue({ faces: [{ boundingBox: {} }], gestures: [], objects: [] })
    const handler = vi.fn()
    on('face_detected', handler)
    start()
    vi.advanceTimersByTime(20)
    expect(handler).not.toHaveBeenCalled()
  })

  it('stop() → no more events', async () => {
    await init(makeVideo())
    mockDetect.mockReturnValue({ faces: [{ boundingBox: {} }], gestures: [], objects: [] })
    const handler = vi.fn()
    on('face_detected', handler)
    start()
    stop()
    vi.advanceTimersByTime(20)
    expect(handler).not.toHaveBeenCalled()
  })
})
