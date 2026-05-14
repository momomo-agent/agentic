// End-to-end test: abort with buffered data in the generator.
// This is the exact scenario that was failing: core generator yields multiple
// events synchronously (buffered), abort fires, but next() keeps returning
// buffered events instead of { done: true }.
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

describe('abort with buffered generator data', () => {
  it('next() returns { done: true } immediately after abort even if generator has buffered events', async () => {
    // Simulate a generator that yields MANY events synchronously (all buffered)
    globalThis.agenticAsk = (input, config) => {
      return (async function* () {
        // These all yield synchronously — they'll be buffered
        yield { type: 'status', message: 'starting' }
        yield { type: 'text_delta', text: 'Hello' }
        yield { type: 'text_delta', text: ' world' }
        yield { type: 'text_delta', text: ' this' }
        yield { type: 'text_delta', text: ' is' }
        yield { type: 'text_delta', text: ' a' }
        yield { type: 'text_delta', text: ' long' }
        yield { type: 'text_delta', text: ' response' }
        yield { type: 'done', answer: 'Hello world this is a long response', rounds: 1 }
      })()
    }

    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    const session = claw.session()

    const gen = session.chat('test')
    const iter = gen[Symbol.asyncIterator]()

    // Consume first event
    const e1 = await iter.next()
    expect(e1.value.type).toBe('status')

    // Consume second event (first text_delta)
    const e2 = await iter.next()
    expect(e2.value.type).toBe('text_delta')
    expect(e2.value.text).toBe('Hello')

    // NOW ABORT — there are still 7 buffered events in the generator
    session.abort()

    // The VERY NEXT call to next() must return { done: true }
    // NOT a buffered text_delta event
    const e3 = await iter.next()
    expect(e3.done).toBe(true)
    expect(e3.value).toBeUndefined()

    claw.destroy()
  })

  it('abort before any consumption returns done immediately', async () => {
    globalThis.agenticAsk = (input, config) => {
      return (async function* () {
        yield { type: 'text_delta', text: 'never seen' }
        yield { type: 'done', answer: 'never seen', rounds: 1 }
      })()
    }

    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    const session = claw.session()

    const gen = session.chat('test')
    const iter = gen[Symbol.asyncIterator]()

    // Consume first event to start the generator
    const e1 = await iter.next()

    // Abort immediately
    session.abort()

    // Must be done
    const e2 = await iter.next()
    expect(e2.done).toBe(true)

    claw.destroy()
  })

  it('abort during for-await stops iteration immediately', async () => {
    let yieldCount = 0
    globalThis.agenticAsk = (input, config) => {
      return (async function* () {
        for (let i = 0; i < 100; i++) {
          yieldCount++
          yield { type: 'text_delta', text: `chunk${i}` }
        }
        yield { type: 'done', answer: 'all chunks', rounds: 1 }
      })()
    }

    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    const session = claw.session()

    const collected = []
    for await (const event of session.chat('test')) {
      collected.push(event)
      // Abort after receiving 3 events
      if (collected.length === 3) {
        session.abort()
      }
    }

    // Should have stopped at 3 events (not continued to 100+)
    expect(collected.length).toBe(3)

    claw.destroy()
  })

  it('timing: abort resolves next() in under 5ms', async () => {
    globalThis.agenticAsk = (input, config) => {
      return (async function* () {
        yield { type: 'text_delta', text: 'a' }
        yield { type: 'text_delta', text: 'b' }
        yield { type: 'text_delta', text: 'c' }
        // Then block forever
        await new Promise(() => {})
      })()
    }

    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    const session = claw.session()

    const gen = session.chat('test')
    const iter = gen[Symbol.asyncIterator]()

    // Consume first event
    await iter.next()

    // Abort
    session.abort()

    // Measure how fast next() resolves
    const t0 = performance.now()
    const result = await iter.next()
    const elapsed = performance.now() - t0

    expect(result.done).toBe(true)
    expect(elapsed).toBeLessThan(5) // Should be essentially instant

    claw.destroy()
  })
})
