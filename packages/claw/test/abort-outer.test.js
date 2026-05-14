// Tests that abort terminates the OUTER for-await loop consuming _chatGenerator,
// even when _chatGenerator's finally block is stuck in an await.
// This is the real-world scenario: _chatGenerator yields events, then in finally
// does `await sessionMem.assistant(partial)` + `await _persistHistory(...)`.
// If those awaits are slow/stuck, the outer consumer must still unblock on abort.
import { describe, it, expect } from 'vitest'
import { createClaw } from '../src/index.js'

describe('abort unblocks outer consumer of _chatGenerator', () => {
  it('for-await on session.chat() terminates even if _chatGenerator finally is slow', async () => {
    // Make sessionMem.assistant() hang to simulate slow persist
    let assistantResolve
    const slowAssistant = new Promise(r => { assistantResolve = r })

    globalThis.AgenticMemory = {
      createMemory: () => {
        const msgs = []
        return {
          id: 'default',
          async user(c) { msgs.push({ role: 'user', content: c }) },
          async assistant(c) {
            // First call (from done event) is normal, second (from finally) hangs
            if (msgs.some(m => m.role === 'assistant')) {
              await slowAssistant // This hangs forever
            }
            msgs.push({ role: 'assistant', content: c })
          },
          messages() { return msgs.slice() },
          history() { return msgs.slice() },
          popLast() { msgs.pop() },
          info() { return { turns: msgs.length, messageCount: msgs.length, tokens: 0, maxTokens: 8000 } },
          clear() { msgs.length = 0 },
          destroy() {},
        }
      },
    }

    let gate
    const gatePromise = new Promise(r => { gate = r })

    globalThis.agenticAsk = (input, config) => {
      return (async function* () {
        yield { type: 'text_delta', text: 'hello' }
        await gatePromise // Block here until abort
        yield { type: 'done', answer: 'hello world', rounds: 1 }
      })()
    }

    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    const session = claw.session()

    const collected = []
    let loopDone = false

    // Start consuming
    const consumePromise = (async () => {
      for await (const event of session.chat('test')) {
        collected.push(event)
        if (event.type === 'text_delta') {
          // Abort after first text_delta
          session.abort()
        }
      }
      loopDone = true
    })()

    // Wait for loop to finish (should be fast after abort)
    const result = await Promise.race([
      consumePromise.then(() => 'done'),
      new Promise(r => setTimeout(() => r('TIMEOUT'), 500)),
    ])

    expect(result).toBe('done')
    expect(loopDone).toBe(true)
    expect(collected.length).toBeLessThanOrEqual(2) // status + text_delta at most

    // Cleanup
    gate()
    assistantResolve()
    claw.destroy()
  })

  it('thenable mode (await claw.chat()) resolves on abort even with slow finally', async () => {
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

    // Abort on first token
    claw.on('token', () => {
      Promise.resolve().then(() => claw.session().abort())
    })

    const result = await Promise.race([
      claw.chat('hi'),
      new Promise(r => setTimeout(() => r('TIMEOUT'), 500)),
    ])

    expect(result).not.toBe('TIMEOUT')

    gate()
    claw.destroy()
  })
})
