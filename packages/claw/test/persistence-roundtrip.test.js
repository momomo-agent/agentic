/**
 * End-to-end smoke test for the persist+hydrate round-trip wiring.
 *
 * Uses the real agentic-memory + agentic-store mocks (just an in-memory KV)
 * so we exercise the actual _loadHistory → _replayHistoryInto → conductor.hydrate
 * path inside src/index.js, not just the test mocks.
 */

import { describe, it, expect, vi } from 'vitest'

// Stub conductor — capture hydrate + chat shape so we can assert end-to-end.
let lastTalker = null
globalThis.AgenticConductor = {
  createConductor: vi.fn(() => {
    const _talker = []
    lastTalker = _talker
    return {
      chat: async function* (input) {
        _talker.push({ role: 'user', content: input })
        yield { type: 'text', text: 'reply: ' + input }
        yield { type: 'done', reply: 'reply: ' + input, intents: [] }
        _talker.push({ role: 'assistant', content: 'reply: ' + input })
      },
      hydrate: (h) => {
        _talker.length = 0
        for (const m of (h || [])) {
          if (m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') {
            _talker.push({ role: m.role, content: m.content })
          }
        }
      },
      destroy() {},
      on: () => () => {},
      getState: () => ({ strategy: 'single' }),
      getIntents: () => [],
      _talker,
    }
  }),
}

// Real in-memory store — survives across createClaw calls.
const kv = new Map()
globalThis.AgenticStore = {
  createStore: () => ({
    kvGet: async (k) => kv.get(k),
    kvSet: async (k, v) => { kv.set(k, v) },
  }),
}

// Stub memory — but make user/assistant push to a per-session array we read back.
function makeMem(id) {
  const arr = []
  return {
    id,
    user: async (c) => { arr.push({ role: 'user', content: c }) },
    assistant: async (c) => { arr.push({ role: 'assistant', content: c }) },
    messages: () => arr.slice(),
    history: () => arr.slice(),
    clear: () => { arr.length = 0 },
    popLast: () => { arr.pop() },
    destroy() {},
  }
}
globalThis.AgenticMemory = { createMemory: ({ id } = {}) => makeMem(id || 'default') }

const { createClaw } = await import('../src/index.js')

describe('persist round-trip across createClaw boundary', () => {
  it('history written by boot 1 is replayed into boot 2 conductor and sessionMem', async () => {
    kv.clear()

    const c1 = createClaw({ apiKey: 'test', persist: '/tmp/claw-rt' })
    await c1.chat('hello')
    await c1.chat('world')
    c1.destroy()

    // Boot 2 — fresh instance, same persist path.
    const c2 = createClaw({ apiKey: 'test', persist: '/tmp/claw-rt' })
    await c2.chat('again')

    // Conductor saw the restored history before the new turn.
    const talkerUsers = lastTalker.filter(m => m.role === 'user').map(m => m.content)
    expect(talkerUsers).toEqual(['hello', 'world', 'again'])

    const sessUsers = c2.memory.messages().filter(m => m.role === 'user').map(m => m.content)
    expect(sessUsers).toEqual(['hello', 'world', 'again'])

    c2.destroy()
  })

  it('no persist path → no kvGet, no hydration, fresh start', async () => {
    kv.clear()
    const c = createClaw({ apiKey: 'test' }) // no persist
    await c.chat('x')
    expect(kv.size).toBe(0)
    c.destroy()
  })
})
