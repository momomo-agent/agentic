import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '../..')

// Mock agentic-sense
vi.mock('agentic-sense', () => ({
  AgenticSense: class { detect = vi.fn(() => ({ faces: [], gestures: [], objects: [] })) },
  createPipeline: vi.fn(async () => ({
    detect: vi.fn(() => ({ faces: [], gestures: [], objects: [] })),
    _video: null
  }))
}))

// Mock agentic-store
const mockStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
vi.mock('agentic-store', () => ({ open: vi.fn(async () => mockStore) }))

beforeEach(() => { vi.resetModules(); mockStore.get.mockReset(); mockStore.set.mockReset(); mockStore.delete.mockReset() })

// DBB-001/002: sense.js loads in Node.js without requestAnimationFrame
describe('DBB-001/002: sense.js Node.js compat', () => {
  it('loads without ReferenceError', async () => {
    const sense = await import('../../src/runtime/sense.js')
    expect(typeof sense.start).toBe('function')
    expect(typeof sense.stop).toBe('function')
  })

  it('start/stop do not throw', async () => {
    const sense = await import('../../src/runtime/sense.js')
    expect(() => { sense.start(); sense.stop() }).not.toThrow()
  })

  it('uses setInterval not requestAnimationFrame', () => {
    const src = readFileSync(join(root, 'src/runtime/sense.js'), 'utf8')
    expect(src).not.toContain('requestAnimationFrame')
    expect(src).toContain('setInterval')
  })
})

// DBB-003/004: store.delete() and store.del() both exported
describe('DBB-003/004: store.delete alias', () => {
  it('store.delete is a function', async () => {
    const store = await import('../../src/store/index.js')
    expect(typeof store.delete).toBe('function')
  })

  it('store.del is a function', async () => {
    const store = await import('../../src/store/index.js')
    expect(typeof store.del).toBe('function')
  })

  it('store.delete calls underlying delete', async () => {
    mockStore.delete.mockResolvedValue(undefined)
    const store = await import('../../src/store/index.js')
    await store.delete('foo')
    expect(mockStore.delete).toHaveBeenCalledWith('foo')
  })

  it('store.del calls underlying delete', async () => {
    mockStore.delete.mockResolvedValue(undefined)
    const store = await import('../../src/store/index.js')
    await store.del('bar')
    expect(mockStore.delete).toHaveBeenCalledWith('bar')
  })
})

// DBB-005: hub.js wakeword broadcast
describe('DBB-005: hub.js wakeword broadcast', () => {
  it('broadcasts wakeword to all connected devices', async () => {
    const { broadcastWakeword, registerDevice, unregisterDevice } = await import('../../src/server/hub.js')
    const received = []
    const mkWs = (id) => ({ send: (d) => received.push({ id, msg: JSON.parse(d) }), readyState: 1 })
    registerDevice({ id: 'w-a', name: 'A', capabilities: [], ws: mkWs('w-a'), lastPong: Date.now() })
    registerDevice({ id: 'w-b', name: 'B', capabilities: [], ws: mkWs('w-b'), lastPong: Date.now() })
    broadcastWakeword()
    expect(received.filter(r => r.id === 'w-a' && r.msg.type === 'wakeword')).toHaveLength(1)
    expect(received.filter(r => r.id === 'w-b' && r.msg.type === 'wakeword')).toHaveLength(1)
    unregisterDevice('w-a'); unregisterDevice('w-b')
  })
})

// DBB-006: heartbeat timeout is 60s
describe('DBB-006: hub.js heartbeat 60s', () => {
  it('uses 60000ms not 40000ms', () => {
    const src = readFileSync(join(root, 'src/server/hub.js'), 'utf8')
    expect(src).not.toContain('40000')
    expect(src).toContain('60000')
  })
})

// DBB-007: brain.js tool_use has text field
describe('DBB-007: brain.js tool_use text field', () => {
  it('all tool_use yields include text field', () => {
    const src = readFileSync(join(root, 'src/server/brain.js'), 'utf8')
    const yieldBlocks = src.split('\n').filter(l => l.includes('tool_use') && l.includes('yield'))
    expect(yieldBlocks.length).toBeGreaterThan(0)
    // Each yield line with tool_use should be followed by text: within nearby lines
    const toolUseIdx = src.indexOf("type: 'tool_use'")
    expect(src.slice(toolUseIdx, toolUseIdx + 300)).toContain('text:')
  })
})
