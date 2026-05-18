/**
 * Test: direct askFn path (no conductor) must not duplicate user messages.
 *
 * Bug: sessionMem.user(input) adds the message, then _buildAskConfig uses
 * sessionMem.history() (which includes it), then askFn(input, config) adds
 * it again as the prompt → user message appears twice in LLM request.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// NO conductor — force direct askFn path
delete globalThis.AgenticConductor

const llmCallHistory = []

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
      popLast: vi.fn(() => msgs.pop()),
    }
  },
}

// Mock askFn that records what it receives
globalThis.agenticAsk = vi.fn(async function* (input, config) {
  llmCallHistory.push({
    input,
    historyLength: config.history?.length || 0,
    history: JSON.parse(JSON.stringify(config.history || [])),
  })
  yield { type: 'text_delta', text: `re: ${input}` }
  yield { type: 'done', answer: `re: ${input}`, rounds: 1 }
})

const { createClaw } = await import('../src/index.js')

beforeEach(() => { llmCallHistory.length = 0 })

describe('direct askFn path: no user message duplication', () => {
  it('first message: history is empty, input is the user message', async () => {
    const claw = createClaw({ apiKey: 'test' })
    await claw.chat('hello')

    expect(llmCallHistory).toHaveLength(1)
    expect(llmCallHistory[0].input).toBe('hello')
    expect(llmCallHistory[0].history).toEqual([])
    claw.destroy()
  })

  it('second message: history has [user+assistant] from first turn, no duplicate', async () => {
    const claw = createClaw({ apiKey: 'test' })
    await claw.chat('first')
    await claw.chat('second')

    expect(llmCallHistory).toHaveLength(2)
    // Second call
    expect(llmCallHistory[1].input).toBe('second')
    expect(llmCallHistory[1].history).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 're: first' },
    ])
    // "second" should NOT appear in history (it's the input param)
    expect(llmCallHistory[1].history.some(m => m.content === 'second')).toBe(false)
    claw.destroy()
  })

  it('three turns: each turn has correct history without duplication', async () => {
    const claw = createClaw({ apiKey: 'test' })
    await claw.chat('A')
    await claw.chat('B')
    await claw.chat('C')

    // Third call
    expect(llmCallHistory[2].input).toBe('C')
    expect(llmCallHistory[2].history).toEqual([
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 're: A' },
      { role: 'user', content: 'B' },
      { role: 'assistant', content: 're: B' },
    ])
    claw.destroy()
  })

  it('generator consumer that breaks on done still preserves assistant history', async () => {
    const claw = createClaw({ apiKey: 'test' })

    for await (const event of claw.chat('first')) {
      if (event.type === 'done') break
    }
    for await (const event of claw.chat('second')) {
      if (event.type === 'done') break
    }

    expect(llmCallHistory[1].history).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 're: first' },
    ])
    expect(claw.memory.messages()).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 're: first' },
      { role: 'user', content: 'second' },
      { role: 'assistant', content: 're: second' },
    ])
    claw.destroy()
  })
})
