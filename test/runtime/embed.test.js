import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('agentic-embed', () => ({
  embed: vi.fn(async (text) => [0.1, 0.2, 0.3])
}))

import { embed } from '../../src/runtime/embed.js'

describe('embed', () => {
  it('DBB-001: returns float array for normal text', async () => {
    const result = await embed('hello world')
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(v => isFinite(v))).toBe(true)
  })

  it('DBB-002: returns [] for empty string', async () => {
    const result = await embed('')
    expect(result).toEqual([])
  })

  it('throws TypeError for non-string input', async () => {
    await expect(embed(null)).rejects.toThrow(TypeError)
    await expect(embed(123)).rejects.toThrow(TypeError)
  })

  it('propagates errors from agentic-embed', async () => {
    const { embed: agenticEmbed } = await import('agentic-embed')
    agenticEmbed.mockRejectedValueOnce(new Error('model not loaded'))
    await expect(embed('test')).rejects.toThrow('model not loaded')
  })
})
