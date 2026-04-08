import { describe, it, expect, vi } from 'vitest'

const mockPipeline = vi.hoisted(() => ({
  detect: vi.fn(() => ({
    faces: [{ boundingBox: { x: 0, y: 0 } }],
    gestures: [{ gesture: 'wave' }],
    objects: [{ label: 'cup', confidence: 0.9 }]
  }))
}))

vi.mock('agentic-sense', () => ({
  createPipeline: vi.fn().mockResolvedValue(mockPipeline)
}))

import * as senseMod from '../../src/runtime/sense.js'

describe('sense.detect', () => {
  it('DBB-004: null frame returns empty result', () => {
    expect(senseMod.detect(null)).toEqual({ faces: [], gestures: [], objects: [] })
  })

  it('DBB-004: undefined frame returns empty result', () => {
    expect(senseMod.detect(undefined)).toEqual({ faces: [], gestures: [], objects: [] })
  })

  it('DBB-001: returns faces after init', async () => {
    await senseMod.init(null)
    const result = senseMod.detect({ data: 'frame' })
    expect(Array.isArray(result.faces)).toBe(true)
    expect(result.faces.length).toBeGreaterThanOrEqual(1)
  })

  it('DBB-002: returns gestures after init', () => {
    const result = senseMod.detect({ data: 'frame' })
    expect(Array.isArray(result.gestures)).toBe(true)
    expect(result.gestures.length).toBeGreaterThanOrEqual(1)
  })

  it('DBB-003: returns objects after init', () => {
    const result = senseMod.detect({ data: 'frame' })
    expect(Array.isArray(result.objects)).toBe(true)
    expect(result.objects.length).toBeGreaterThanOrEqual(1)
  })

  it('propagates pipeline errors (no error swallowing in impl)', () => {
    mockPipeline.detect.mockImplementationOnce(() => { throw new Error('model error') })
    expect(() => senseMod.detect({ data: 'frame' })).toThrow('model error')
  })
})
