import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const src = (f) => join(__dir, '../../src', f)

vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 16))
vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id))

vi.mock('agentic-sense', () => ({
  AgenticSense: class { detect = vi.fn(() => ({ faces: [], gestures: [], objects: [] })) },
  createPipeline: vi.fn(async () => ({ detect: vi.fn(() => ({ faces: [], gestures: [], objects: [] })) }))
}))

vi.mock('agentic-store', () => {
  const store = new Map()
  return {
    open: vi.fn(async () => ({
      get: vi.fn(async (k) => store.get(k) ?? null),
      set: vi.fn(async (k, v) => store.set(k, v)),
      delete: vi.fn(async (k) => store.delete(k))
    }))
  }
})

describe('m15 DBB', () => {
  it('DBB-001: sense.js loads in Node.js without ReferenceError', async () => {
    const sense = await import(src('runtime/sense.js'))
    expect(typeof sense.start).toBe('function')
    expect(typeof sense.stop).toBe('function')
  })

  it('DBB-002: sense.js start()/stop() do not throw', async () => {
    const { start, stop } = await import(src('runtime/sense.js'))
    expect(() => { start(); stop() }).not.toThrow()
  })

  it('DBB-003: store.delete() is exported', async () => {
    const store = await import(src('store/index.js'))
    expect(typeof store.delete).toBe('function')
  })

  it('DBB-004: store.del() still works', async () => {
    const store = await import(src('store/index.js'))
    expect(typeof store.del).toBe('function')
  })

  it('DBB-005: hub.js broadcastWakeword sends to all devices', async () => {
    const { broadcastWakeword, registerDevice, unregisterDevice } = await import(src('server/hub.js'))
    const received = []
    const mockWs = (id) => ({ send: (d) => received.push({ id, data: JSON.parse(d) }) })
    registerDevice({ id: 'w-a', name: 'A', capabilities: [], ws: mockWs('w-a'), lastPong: Date.now() })
    registerDevice({ id: 'w-b', name: 'B', capabilities: [], ws: mockWs('w-b'), lastPong: Date.now() })
    broadcastWakeword()
    const wakewords = received.filter(r => r.data.type === 'wakeword')
    expect(wakewords.some(r => r.id === 'w-a')).toBe(true)
    expect(wakewords.some(r => r.id === 'w-b')).toBe(true)
    unregisterDevice('w-a'); unregisterDevice('w-b')
  })

  it('DBB-006: hub.js heartbeat timeout is 60000ms', () => {
    const hubSrc = readFileSync(src('server/hub.js'), 'utf8')
    expect(hubSrc).not.toContain('40000')
    expect(hubSrc).toContain('60000')
  })

  it('DBB-007: brain.js tool_use yields include text field', () => {
    const brainSrc = readFileSync(src('server/brain.js'), 'utf8')
    const blocks = brainSrc.split("type: 'tool_use'")
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].slice(0, 300)).toContain('text:')
    }
  })
})
