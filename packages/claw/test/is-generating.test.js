// Tests that isGenerating is true immediately after chat() returns,
// BEFORE the generator starts executing (lazy generator body).
import { describe, it, expect } from 'vitest'
import { createClaw } from '../src/index.js'

globalThis.AgenticMemory = {
  createMemory: () => {
    const msgs = []
    return {
      id: 'default',
      async user(c) { msgs.push({ role: 'user', content: c }) },
      async assistant(c) { msgs.push({ role: 'assistant', content: c }) },
      messages() { return msgs.slice() },
      history() { return msgs.slice() },
      popLast() { msgs.pop() },
      info() { return { turns: msgs.length, messageCount: msgs.length, tokens: 0, maxTokens: 8000 } },
      clear() { msgs.length = 0 },
      destroy() {},
    }
  },
}

describe('isGenerating timing', () => {
  it('isGenerating is true immediately after chat() returns (before first .next())', () => {
    globalThis.agenticAsk = (input, config) => {
      return (async function* () {
        yield { type: 'text_delta', text: 'hi' }
        yield { type: 'done', answer: 'hi', rounds: 1 }
      })()
    }

    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    const session = claw.session()

    // Before chat
    expect(session.isGenerating).toBe(false)

    // After chat() returns but BEFORE consuming any events
    const gen = session.chat('test')
    expect(session.isGenerating).toBe(true)

    // Cleanup: consume to avoid dangling
    ;(async () => { for await (const _ of gen) {} })()

    // After abort
    session.abort()
    expect(session.isGenerating).toBe(false)

    claw.destroy()
  })

  it('abort() works immediately after chat() without consuming any events', async () => {
    let askCalled = false
    globalThis.agenticAsk = (input, config) => {
      askCalled = true
      return (async function* () {
        await new Promise(() => {}) // never resolves
      })()
    }

    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    const session = claw.session()

    const gen = session.chat('test')
    expect(session.isGenerating).toBe(true)

    // Abort immediately — generator hasn't even started
    session.abort()
    expect(session.isGenerating).toBe(false)

    // Consuming should immediately get done
    const iter = gen[Symbol.asyncIterator]()
    const result = await iter.next()
    expect(result.done).toBe(true)

    claw.destroy()
  })

  it('top-level claw.isGenerating reflects session state', () => {
    globalThis.agenticAsk = (input, config) => {
      return (async function* () {
        yield { type: 'done', answer: 'x', rounds: 1 }
      })()
    }

    const claw = createClaw({ apiKey: 'k', conductorModule: {} })

    expect(claw.isGenerating).toBe(false)
    const gen = claw.chat('hi')
    expect(claw.isGenerating).toBe(true)

    claw.session().abort()
    expect(claw.isGenerating).toBe(false)

    claw.destroy()
  })
})
