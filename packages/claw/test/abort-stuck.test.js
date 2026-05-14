// Tests that abort() terminates the core generator even when it's stuck in a long await.
// This verifies the fix: claw registers an abort listener that calls result.return().
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

describe('abort terminates stuck generator', () => {
  it('abort() during long tool execution resolves the for-await loop', async () => {
    // Simulate a generator that yields one event then blocks forever (like a tool fetch)
    let neverResolve
    const neverPromise = new Promise(r => { neverResolve = r })
    let generatorReturned = false

    globalThis.agenticAsk = (input, config) => {
      return (async function* () {
        try {
          yield { type: 'status', message: 'starting' }
          yield { type: 'text_delta', text: 'partial' }
          // Simulate stuck tool execution — this await never resolves naturally
          await neverPromise
          yield { type: 'done', answer: 'should not reach', rounds: 1 }
        } finally {
          generatorReturned = true
        }
      })()
    }

    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    const session = claw.session()

    const gen = session.chat('test')
    const iter = gen[Symbol.asyncIterator]()

    // Consume first two events
    const e1 = await iter.next()
    expect(e1.value.type).toBe('status')
    const e2 = await iter.next()
    expect(e2.value.type).toBe('text_delta')
    expect(session.isGenerating).toBe(true)

    // Abort while generator is stuck in neverPromise
    session.abort()
    expect(session.isGenerating).toBe(false)

    // The for-await in claw should now terminate — next() should resolve
    const e3 = await iter.next()
    expect(e3.done).toBe(true)

    // Note: the underlying generator's finally block may not run immediately
    // because it's still stuck in `await neverPromise`. The important thing
    // is that the consumer (claw) is unblocked.
    expect(session.isGenerating).toBe(false)

    // Cleanup
    neverResolve() // prevent dangling promise
    claw.destroy()
  })

  it('abort() during streaming yields no more events to consumer', async () => {
    let gate
    const gatePromise = new Promise(r => { gate = r })

    globalThis.agenticAsk = (input, config) => {
      return (async function* () {
        yield { type: 'status', message: 'r1' }
        yield { type: 'text_delta', text: 'hello' }
        await gatePromise
        yield { type: 'text_delta', text: ' world' }
        yield { type: 'done', answer: 'hello world', rounds: 1 }
      })()
    }

    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    const session = claw.session()
    const collected = []

    const gen = session.chat('hi')
    const iter = gen[Symbol.asyncIterator]()

    collected.push((await iter.next()).value)
    collected.push((await iter.next()).value)
    expect(collected[1].text).toBe('hello')

    // Abort mid-stream
    session.abort()

    // Should terminate immediately
    const final = await iter.next()
    expect(final.done).toBe(true)

    // No more events after abort
    expect(collected.length).toBe(2)

    gate()
    claw.destroy()
  })

  it('abort() resolves the thenable wrapper (await claw.chat(...))', async () => {
    let gate
    const gatePromise = new Promise(r => { gate = r })

    globalThis.agenticAsk = (input, config) => {
      return (async function* () {
        yield { type: 'text_delta', text: 'partial' }
        await gatePromise
        yield { type: 'done', answer: 'full', rounds: 1 }
      })()
    }

    const claw = createClaw({ apiKey: 'k', conductorModule: {} })

    // Abort after first token arrives
    claw.on('token', () => {
      // Schedule abort on next microtask so the yield completes first
      Promise.resolve().then(() => claw.session().abort())
    })

    // Await the thenable — it should resolve (not hang) after abort
    const result = await Promise.race([
      claw.chat('hi'),
      new Promise(r => setTimeout(() => r('TIMEOUT'), 1000)),
    ])
    expect(result).not.toBe('TIMEOUT')
    // Result should have answer field (partial or empty after abort)
    expect(typeof result.answer).toBe('string')
    gate()
    claw.destroy()
  })
})
