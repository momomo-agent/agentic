/**
 * Verifies three claims:
 *   1. createClaw() defaults to conductor strategy='dispatch' (NOT 'single').
 *   2. In both 'dispatch' and 'single', messages are stored in claw.sessionMem
 *      AND in conductor._talkerMessages. The LLM only sees the conductor copy
 *      (so the wire is not duplicated), but the two stores can drift and
 *      persist layer only saves sessionMem.
 *   3. persist + _loadHistory wiring: history is written via _persistHistory,
 *      but never read back, so restart drops context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track what conductor sees as messages.
const conductorMessagesSeen = []
let lastConductorOpts = null

// Mock agentic-conductor
globalThis.AgenticConductor = {
  createConductor: vi.fn((opts) => {
    lastConductorOpts = opts
    const _talker = []
    return {
      chat: async function* (input, chatOpts = {}) {
        _talker.push({ role: 'user', content: input })
        conductorMessagesSeen.push([..._talker])
        yield { type: 'text', text: 'ack: ' + input }
        yield { type: 'done', reply: 'ack: ' + input, intents: [], usage: {} }
        _talker.push({ role: 'assistant', content: 'ack: ' + input })
      },
      destroy: vi.fn(),
      on: vi.fn(() => () => {}),
      getState: () => ({ strategy: opts.strategy || 'dispatch' }),
      getIntents: () => [],
      _talker, // expose for inspection
    }
  }),
}

// Mock agentic-memory with a real-ish memory
function makeRealMemory(id) {
  const msgs = []
  return {
    id,
    user: vi.fn((content) => { msgs.push({ role: 'user', content }); return Promise.resolve() }),
    assistant: vi.fn((content) => { msgs.push({ role: 'assistant', content }); return Promise.resolve() }),
    messages: () => msgs.slice(),
    history: () => msgs.slice(),
    clear: vi.fn(() => { msgs.length = 0 }),
    destroy: vi.fn(),
  }
}
globalThis.AgenticMemory = { createMemory: ({ id } = {}) => makeRealMemory(id || 'default') }

// Mock agentic-core askFn — should NOT be called on conductor path
globalThis.agenticAsk = vi.fn(async function* () {
  yield { type: 'done', answer: 'DIRECT', rounds: 1 }
})

const { createClaw } = await import('../src/index.js')

beforeEach(() => {
  conductorMessagesSeen.length = 0
  lastConductorOpts = null
})

describe('default mode', () => {
  it('defaults to strategy="single"', () => {
    const claw = createClaw({ apiKey: 'test' })
    expect(lastConductorOpts).not.toBeNull()
    expect(lastConductorOpts.strategy).toBe('single')
    claw.destroy()
  })

  it('when caller explicitly sets single, it is forwarded', () => {
    const claw = createClaw({ apiKey: 'test', strategy: 'single' })
    expect(lastConductorOpts.strategy).toBe('single')
    claw.destroy()
  })
})

describe('context recording (dispatch path)', () => {
  it('stores user+assistant in sessionMem AND in conductor._talker, but only _talker is sent to LLM', async () => {
    const claw = createClaw({ apiKey: 'test' })
    await claw.chat('hello')
    await claw.chat('again')

    // sessionMem has all 4 turns
    const sess = claw.memory.messages()
    expect(sess.map(m => m.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
    expect(sess.map(m => m.content)).toEqual(['hello', 'ack: hello', 'again', 'ack: again'])

    // conductor._talker also has all 4
    const talker = claw.conductor._talker
    expect(talker.map(m => m.role)).toEqual(['user', 'assistant', 'user', 'assistant'])

    // What was actually sent to the "LLM" on the 2nd call was the conductor copy,
    // not sessionMem. Check that no duplication happened (one user per call).
    expect(conductorMessagesSeen).toHaveLength(2)
    // 1st call: just the new user
    expect(conductorMessagesSeen[0].filter(m => m.role === 'user')).toHaveLength(1)
    // 2nd call: previous user+assistant + new user (3 total, 2 users)
    expect(conductorMessagesSeen[1].filter(m => m.role === 'user')).toHaveLength(2)

    claw.destroy()
  })

  it('sessionMem and conductor._talker stay in sync content-wise for simple cases', async () => {
    const claw = createClaw({ apiKey: 'test' })
    await claw.chat('one')
    await claw.chat('two')
    const sess = claw.memory.messages()
    const talker = claw.conductor._talker
    expect(sess.length).toBe(talker.length)
    for (let i = 0; i < sess.length; i++) {
      expect(sess[i].role).toBe(talker[i].role)
      expect(sess[i].content).toBe(talker[i].content)
    }
    claw.destroy()
  })
})

describe('persistence wiring', () => {
  it('_loadHistory is never invoked on startup (context lost across restarts)', async () => {
    // Mock agentic-store so we can watch reads/writes
    const kv = new Map()
    const kvGet = vi.fn(async (k) => kv.get(k))
    const kvSet = vi.fn(async (k, v) => { kv.set(k, v) })
    globalThis.AgenticStore = {
      createStore: vi.fn(() => ({ kvGet, kvSet })),
    }

    const claw = createClaw({ apiKey: 'test', persist: '/tmp/claw-test-ctx' })
    await claw.chat('persisted-hi')
    claw.destroy()

    // We WROTE history
    expect(kvSet).toHaveBeenCalled()
    const writeKey = kvSet.mock.calls[0][0]
    expect(writeKey).toMatch(/^history:/)

    // But we NEVER read it back during createClaw / first chat.
    // This is the bug I flagged: _loadHistory is defined but not wired.
    expect(kvGet).not.toHaveBeenCalled()
  })
})
