import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDetect = vi.fn()
vi.mock('agentic-sense', () => ({
  AgenticSense: class { detect = mockDetect },
  createPipeline: vi.fn(async () => ({ detect: mockDetect }))
}))

// Reset module state between tests
beforeEach(async () => {
  vi.resetModules()
  mockDetect.mockReset()
})

describe('sense.js detect(frame) — m10 fix', () => {
  it('DBB-001: returns empty arrays before init()', async () => {
    const { detect } = await import('../../src/runtime/sense.js')
    const result = detect({})
    expect(result).toEqual({ faces: [], gestures: [], objects: [] })
  })

  it('DBB-001: does not throw before init()', async () => {
    const { detect } = await import('../../src/runtime/sense.js')
    expect(() => detect(null)).not.toThrow()
  })

  it('DBB-002: maps faces after init()', async () => {
    mockDetect.mockReturnValue({
      faces: [{ boundingBox: { x: 1, y: 2 }, extra: 'ignored' }],
      gestures: [],
      objects: []
    })
    const { init, detect } = await import('../../src/runtime/sense.js')
    await init(null)
    const result = detect({})
    expect(result.faces).toEqual([{ boundingBox: { x: 1, y: 2 } }])
  })

  it('DBB-003: maps gestures after init()', async () => {
    mockDetect.mockReturnValue({
      faces: [],
      gestures: [{ gesture: 'wave', extra: 'ignored' }],
      objects: []
    })
    const { init, detect } = await import('../../src/runtime/sense.js')
    await init(null)
    const result = detect({})
    expect(result.gestures).toEqual([{ gesture: 'wave' }])
  })

  it('DBB-004: filters objects below 0.5 confidence', async () => {
    mockDetect.mockReturnValue({
      faces: [],
      gestures: [],
      objects: [
        { label: 'cup', confidence: 0.8 },
        { label: 'pen', confidence: 0.3 }
      ]
    })
    const { init, detect } = await import('../../src/runtime/sense.js')
    await init(null)
    const result = detect({})
    expect(result.objects).toEqual([{ label: 'cup', confidence: 0.8 }])
  })

  it('DBB-001: handles undefined faces/gestures/objects from pipeline', async () => {
    mockDetect.mockReturnValue({})
    const { init, detect } = await import('../../src/runtime/sense.js')
    await init(null)
    const result = detect({})
    expect(result).toEqual({ faces: [], gestures: [], objects: [] })
  })

  it('DBB-001: on() event interface still works after detect() added', async () => {
    const { on } = await import('../../src/runtime/sense.js')
    expect(typeof on).toBe('function')
    // Should not throw when registering handler
    expect(() => on('face_detected', () => {})).not.toThrow()
  })
})
