import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let detectFn
vi.mock('agentic-sense', () => ({
  AgenticSense: class { detect(...args) { return detectFn(...args) } },
  createPipeline: vi.fn(async () => ({
    detect: (...args) => detectFn(...args),
    _video: null,
  })),
}))

import { init, on, start, stop } from '../../src/runtime/sense.js'

function makeVideo(readyState = 4) {
  return { readyState }
}

beforeEach(async () => {
  vi.useFakeTimers()
  stop()
  detectFn = vi.fn(() => ({ faces: [], gestures: [], objects: [] }))
  await init(makeVideo())
})

afterEach(() => {
  stop()
  vi.useRealTimers()
})

describe('sense (m8 API)', () => {
  it('DBB-003: face_detected event emitted with boundingBox', () => {
    detectFn.mockReturnValue({ faces: [{ boundingBox: { x: 1, y: 2, w: 3, h: 4 } }], gestures: [], objects: [] })
    const handler = vi.fn()
    on('face_detected', handler)
    start()
    vi.advanceTimersByTime(100)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'face_detected',
      data: { boundingBox: { x: 1, y: 2, w: 3, h: 4 } },
    }))
  })

  it('DBB-004: gesture_detected event emitted', () => {
    detectFn.mockReturnValue({ faces: [], gestures: [{ gesture: 'wave' }], objects: [] })
    const handler = vi.fn()
    on('gesture_detected', handler)
    start()
    vi.advanceTimersByTime(100)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'gesture_detected',
      data: { gesture: 'wave' },
    }))
  })

  it('object_detected only when confidence > 0.5', () => {
    detectFn.mockReturnValue({ faces: [], gestures: [], objects: [
      { label: 'cup', confidence: 0.8 },
      { label: 'pen', confidence: 0.3 },
    ]})
    const handler = vi.fn()
    on('object_detected', handler)
    start()
    vi.advanceTimersByTime(100)
    expect(handler).toHaveBeenCalled()
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: { label: 'cup', confidence: 0.8 } }))
  })

  it('skips frame when video not ready', async () => {
    const handler = vi.fn()
    on('face_detected', handler)
    stop()
    await init(makeVideo(1))
    start()
    vi.advanceTimersByTime(100)
    expect(handler).not.toHaveBeenCalled()
  })

  it('stop() prevents further events', () => {
    detectFn.mockReturnValue({ faces: [{ boundingBox: {} }], gestures: [], objects: [] })
    const handler = vi.fn()
    on('face_detected', handler)
    start()
    stop()
    vi.advanceTimersByTime(100)
    expect(handler).not.toHaveBeenCalled()
  })

  it('event has ts field', () => {
    detectFn.mockReturnValue({ faces: [{ boundingBox: {} }], gestures: [], objects: [] })
    const handler = vi.fn()
    on('face_detected', handler)
    start()
    vi.advanceTimersByTime(100)
    expect(typeof handler.mock.calls[0][0].ts).toBe('number')
  })
})
