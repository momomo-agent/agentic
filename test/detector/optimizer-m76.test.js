import { describe, it, expect } from 'vitest'
import { optimize } from '../../src/detector/optimizer.js'

describe('optimize', () => {
  it('apple-silicon: returns correct config', () => {
    const r = optimize({ gpu: { type: 'apple-silicon' }, memory: 16, cpu: { cores: 8 } })
    expect(r).toEqual({ threads: 8, memoryLimit: 12, model: 'gemma4:26b', quantization: 'q8' })
  })

  it('nvidia: returns correct config', () => {
    const r = optimize({ gpu: { type: 'nvidia', vram: 8 }, memory: 16, cpu: { cores: 4 } })
    expect(r).toEqual({ threads: 4, memoryLimit: 6, model: 'gemma4:13b', quantization: 'q4' })
  })

  it('cpu-only: returns correct config', () => {
    const r = optimize({ gpu: { type: 'none' }, memory: 8, cpu: { cores: 4 } })
    expect(r).toEqual({ threads: 4, memoryLimit: 4, model: 'gemma2:2b', quantization: 'q4' })
  })

  it('nvidia with no vram uses memory*0.5 fallback', () => {
    const r = optimize({ gpu: { type: 'nvidia' }, memory: 16, cpu: { cores: 4 } })
    expect(r.memoryLimit).toBe(Math.floor(16 * 0.5 * 0.8))
  })
})
