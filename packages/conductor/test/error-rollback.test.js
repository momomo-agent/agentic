/**
 * Test: when fetch/LLM call fails, user message is rolled back from history
 * so that retry doesn't produce duplicate user messages.
 */

import { describe, it, expect } from 'vitest'
import { createConductor } from '../src/conductor.js'

describe('single strategy: error rollback', () => {
  it('user message is removed from history on error, retry works cleanly', async () => {
    let callCount = 0
    const historySnapshots = []

    const ai = {
      chat: async function* (messages) {
        callCount++
        historySnapshots.push(JSON.parse(JSON.stringify(messages)))
        if (callCount === 2) {
          // Second call (first "B") fails
          throw new Error('fetch failed')
        }
        const lastUser = messages[messages.length - 1]?.content || ''
        yield { type: 'done', answer: `re: ${lastUser}`, usage: {} }
      },
    }

    const conductor = createConductor({ ai, tools: [], strategy: 'single' })

    async function drain(input) {
      const events = []
      for await (const e of conductor.chat(input)) events.push(e)
      return events
    }

    // Turn 1: A → success
    await drain('A')

    // Turn 2: B → fails
    let error
    try { await drain('B') } catch (e) { error = e }
    expect(error?.message).toBe('fetch failed')

    // Turn 3: retry B → should see [user:A, assistant:re:A, user:B], NOT [user:A, assistant:re:A, user:B, user:B]
    await drain('B')

    // The retry (3rd call) should have clean history without duplicate B
    const retryHistory = historySnapshots[2] // 3rd ai.chat call
    const userMessages = retryHistory.filter(m => m.role === 'user')
    expect(userMessages).toEqual([
      { role: 'user', content: 'A' },
      { role: 'user', content: 'B' },
    ])

    // No consecutive user messages (which would indicate duplication)
    for (let i = 1; i < retryHistory.length; i++) {
      if (retryHistory[i].role === 'user' && retryHistory[i - 1].role === 'user') {
        throw new Error(`Duplicate consecutive user at index ${i}: ${JSON.stringify(retryHistory)}`)
      }
    }
  })

  it('successful calls are not affected by rollback logic', async () => {
    const historySnapshots = []
    const ai = {
      chat: async function* (messages) {
        historySnapshots.push(JSON.parse(JSON.stringify(messages)))
        yield { type: 'done', answer: 'ok', usage: {} }
      },
    }

    const conductor = createConductor({ ai, tools: [], strategy: 'single' })
    async function drain(input) { for await (const _ of conductor.chat(input)) {} }

    await drain('X')
    await drain('Y')
    await drain('Z')

    expect(historySnapshots[2]).toEqual([
      { role: 'user', content: 'X' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 'Y' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 'Z' },
    ])
  })
})
