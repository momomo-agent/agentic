/**
 * Regression test: single strategy must persist assistant messages in history
 * BEFORE yielding 'done', so that if the consumer stops iterating after 'done',
 * the next turn still has the full conversation context.
 *
 * Bug: user sends A → B → B, LLM re-executes A because it never saw its own
 * reply to A in the history.
 */

import { describe, it, expect } from 'vitest'
import { createConductor } from '../src/conductor.js'

describe('single strategy: assistant message persistence', () => {
  it('history includes assistant reply even when generator is not fully drained after done', async () => {
    const historySnapshots = []

    const ai = {
      chat: async function* (messages, opts = {}) {
        // Record what the LLM sees each turn
        historySnapshots.push(JSON.parse(JSON.stringify(messages)))
        const lastUser = messages[messages.length - 1]?.content || ''
        const reply = `reply to: ${lastUser}`
        yield { type: 'text_delta', text: reply }
        yield { type: 'done', answer: reply, usage: {} }
      },
    }

    const conductor = createConductor({ ai, tools: [], strategy: 'single' })

    // Helper: consume generator only until 'done', then stop (simulates typical usage)
    async function chatUntilDone(input) {
      for await (const e of conductor.chat(input)) {
        if (e.type === 'done') break // stop iterating — generator may not run post-yield code
      }
    }

    await chatUntilDone('A')
    await chatUntilDone('B')
    await chatUntilDone('B again')

    // Turn 1: LLM sees [user:A]
    expect(historySnapshots[0]).toEqual([{ role: 'user', content: 'A' }])

    // Turn 2: LLM sees [user:A, assistant:reply-to-A, user:B]
    expect(historySnapshots[1]).toEqual([
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'reply to: A' },
      { role: 'user', content: 'B' },
    ])

    // Turn 3: LLM sees full history including reply to B
    expect(historySnapshots[2]).toEqual([
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'reply to: A' },
      { role: 'user', content: 'B' },
      { role: 'assistant', content: 'reply to: B' },
      { role: 'user', content: 'B again' },
    ])
  })

  it('history is correct even when generator is fully consumed (for await...of)', async () => {
    const historySnapshots = []

    const ai = {
      chat: async function* (messages) {
        historySnapshots.push(JSON.parse(JSON.stringify(messages)))
        const lastUser = messages[messages.length - 1]?.content || ''
        yield { type: 'done', answer: `re: ${lastUser}`, usage: {} }
      },
    }

    const conductor = createConductor({ ai, tools: [], strategy: 'single' })

    // Fully drain
    async function drain(input) {
      for await (const _ of conductor.chat(input)) {}
    }

    await drain('X')
    await drain('Y')

    expect(historySnapshots[1]).toEqual([
      { role: 'user', content: 'X' },
      { role: 'assistant', content: 're: X' },
      { role: 'user', content: 'Y' },
    ])
  })

  it('dispatch strategy: _talkerMessages already pushes assistant before yield (no bug)', async () => {
    const historySnapshots = []

    const ai = {
      chat: async function* (messages, opts = {}) {
        historySnapshots.push(JSON.parse(JSON.stringify(messages)))
        const lastUser = messages[messages.length - 1]?.content || ''
        yield { type: 'done', answer: `re: ${lastUser}`, usage: {} }
      },
    }

    const conductor = createConductor({ ai, tools: [], strategy: 'dispatch', intentMode: 'tools' })

    async function chatUntilDone(input) {
      for await (const e of conductor.chat(input)) {
        if (e.type === 'done') break
      }
    }

    await chatUntilDone('A')
    await chatUntilDone('B')

    // Dispatch path: _talkerMessages pushes assistant before yield done
    expect(historySnapshots[1].length).toBeGreaterThan(1)
    expect(historySnapshots[1].some(m => m.role === 'assistant')).toBe(true)
  })
})
