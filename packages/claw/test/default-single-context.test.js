/**
 * Verify:
 *   1. createClaw() defaults to strategy='single'
 *   2. Multi-turn context is correctly maintained (A → B → B scenario)
 *   3. No duplicate messages in LLM history
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const historySnapshots = []

// Mock conductor that records what LLM sees
globalThis.AgenticConductor = {
  createConductor: vi.fn((opts) => {
    // Use real single strategy logic from conductor
    const messages = []
    return {
      chat: async function* (input, chatOpts = {}) {
        messages.push({ role: 'user', content: input })
        // Record what would be sent to LLM
        historySnapshots.push(JSON.parse(JSON.stringify(messages)))
        const reply = `reply:${input}`
        yield { type: 'text', text: reply }
        // assistant pushed BEFORE yield done (the fix)
        messages.push({ role: 'assistant', content: reply })
        yield { type: 'done', reply, intents: [], usage: {} }
      },
      destroy: vi.fn(),
      on: vi.fn(() => () => {}),
      getState: () => ({ strategy: opts.strategy }),
      getIntents: () => [],
      _messages: messages,
    }
  }),
}

globalThis.AgenticMemory = {
  createMemory: ({ id } = {}) => {
    const msgs = []
    return {
      id,
      user: vi.fn((c) => { msgs.push({ role: 'user', content: c }) }),
      assistant: vi.fn((c) => { msgs.push({ role: 'assistant', content: c }) }),
      messages: () => msgs.slice(),
      history: () => msgs.slice(),
      clear: vi.fn(() => { msgs.length = 0 }),
      destroy: vi.fn(),
    }
  },
}

globalThis.agenticAsk = vi.fn(async function* () {
  yield { type: 'done', answer: 'SHOULD_NOT_BE_CALLED', rounds: 1 }
})

const { createClaw } = await import('../src/index.js')

beforeEach(() => { historySnapshots.length = 0 })

describe('default single + context correctness', () => {
  it('defaults to strategy=single', () => {
    const claw = createClaw({ apiKey: 'test' })
    const opts = globalThis.AgenticConductor.createConductor.mock.calls.at(-1)[0]
    expect(opts.strategy).toBe('single')
    claw.destroy()
  })

  it('multi-turn: LLM sees full history without duplicates (A → B → B)', async () => {
    const claw = createClaw({ apiKey: 'test' })

    await claw.chat('A')
    await claw.chat('B')
    await claw.chat('B')

    // Turn 1: [user:A]
    expect(historySnapshots[0]).toEqual([
      { role: 'user', content: 'A' },
    ])

    // Turn 2: [user:A, assistant:reply:A, user:B]
    expect(historySnapshots[1]).toEqual([
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'reply:A' },
      { role: 'user', content: 'B' },
    ])

    // Turn 3: [user:A, assistant:reply:A, user:B, assistant:reply:B, user:B]
    expect(historySnapshots[2]).toEqual([
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'reply:A' },
      { role: 'user', content: 'B' },
      { role: 'assistant', content: 'reply:B' },
      { role: 'user', content: 'B' },
    ])

    // No duplicates: each role alternates correctly
    for (const snap of historySnapshots) {
      for (let i = 1; i < snap.length; i++) {
        // No two consecutive messages with same role (except tool sequences)
        if (snap[i].role === 'user' && snap[i - 1].role === 'user') {
          throw new Error(`Duplicate consecutive user messages at index ${i}`)
        }
        if (snap[i].role === 'assistant' && snap[i - 1].role === 'assistant') {
          throw new Error(`Duplicate consecutive assistant messages at index ${i}`)
        }
      }
    }

    claw.destroy()
  })

  it('sessionMem also has correct history (for persist layer)', async () => {
    const claw = createClaw({ apiKey: 'test' })

    await claw.chat('X')
    await claw.chat('Y')

    const mem = claw.memory.messages()
    expect(mem).toEqual([
      { role: 'user', content: 'X' },
      { role: 'assistant', content: 'reply:X' },
      { role: 'user', content: 'Y' },
      { role: 'assistant', content: 'reply:Y' },
    ])

    claw.destroy()
  })

  it('generator break-on-done still preserves context', async () => {
    const claw = createClaw({ apiKey: 'test' })

    // Simulate consumer that breaks on done
    for await (const e of claw.chat('first')) {
      if (e.type === 'done') break
    }
    for await (const e of claw.chat('second')) {
      if (e.type === 'done') break
    }

    // Second call should still see first turn in history
    const lastSnap = historySnapshots.at(-1)
    expect(lastSnap.some(m => m.role === 'assistant' && m.content === 'reply:first')).toBe(true)
    expect(lastSnap.at(-1)).toEqual({ role: 'user', content: 'second' })

    claw.destroy()
  })
})
