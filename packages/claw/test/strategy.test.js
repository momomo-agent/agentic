// Tests for dynamic strategy switching (single ↔ conductor)
import { describe, it, expect } from 'vitest'
import { createClaw } from '../src/index.js'

globalThis.AgenticMemory = {
  createMemory: (opts) => {
    const msgs = []
    return {
      id: opts?.id || 'default',
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

describe('dynamic strategy switching', () => {
  it('defaults to single when no conductor', () => {
    globalThis.agenticAsk = () => (async function* () { yield { type: 'done', answer: 'x', rounds: 1 } })()
    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    expect(claw.getStrategy()).toBe('single')
    expect(claw.hasConductor).toBe(false)
    claw.destroy()
  })

  it('defaults to conductor when conductor is loaded', () => {
    globalThis.agenticAsk = () => (async function* () { yield { type: 'done', answer: 'x', rounds: 1 } })()
    const mockConductor = {
      createConductor: () => ({
        chat: () => (async function* () { yield { type: 'done', reply: 'from conductor' } })(),
        on: () => {},
        destroy: () => {},
      }),
    }
    const claw = createClaw({ apiKey: 'k', conductorModule: mockConductor })
    expect(claw.getStrategy()).toBe('conductor')
    expect(claw.hasConductor).toBe(true)
    claw.destroy()
  })

  it('setStrategy switches from conductor to single at runtime', async () => {
    let path = ''
    globalThis.agenticAsk = () => (async function* () {
      path = 'single'
      yield { type: 'done', answer: 'direct', rounds: 1 }
    })()
    const mockConductor = {
      createConductor: () => ({
        chat: () => (async function* () {
          path = 'conductor'
          yield { type: 'done', reply: 'routed' }
        })(),
        on: () => {},
        destroy: () => {},
      }),
    }
    const claw = createClaw({ apiKey: 'k', conductorModule: mockConductor })

    // Default: conductor
    expect(claw.getStrategy()).toBe('conductor')
    let result = await claw.chat('hi')
    expect(path).toBe('conductor')

    // Switch to single
    claw.setStrategy('single')
    expect(claw.getStrategy()).toBe('single')
    result = await claw.chat('hi again')
    expect(path).toBe('single')

    // Switch back to conductor
    claw.setStrategy('conductor')
    expect(claw.getStrategy()).toBe('conductor')
    result = await claw.chat('once more')
    expect(path).toBe('conductor')

    claw.destroy()
  })

  it('setStrategy throws on invalid value', () => {
    globalThis.agenticAsk = () => (async function* () { yield { type: 'done', answer: 'x', rounds: 1 } })()
    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    expect(() => claw.setStrategy('invalid')).toThrow("strategy must be 'single' or 'conductor'")
    claw.destroy()
  })

  it('setStrategy("conductor") throws when conductor not available', () => {
    globalThis.agenticAsk = () => (async function* () { yield { type: 'done', answer: 'x', rounds: 1 } })()
    const claw = createClaw({ apiKey: 'k', conductorModule: {} })
    expect(() => claw.setStrategy('conductor')).toThrow('conductor not available')
    claw.destroy()
  })

  it('emits strategy event on switch', () => {
    globalThis.agenticAsk = () => (async function* () { yield { type: 'done', answer: 'x', rounds: 1 } })()
    const mockConductor = {
      createConductor: () => ({
        chat: () => (async function* () { yield { type: 'done', reply: 'x' } })(),
        on: () => {},
        destroy: () => {},
      }),
    }
    const claw = createClaw({ apiKey: 'k', conductorModule: mockConductor })
    const events = []
    claw.on('strategy', (e) => events.push(e))

    claw.setStrategy('single')
    claw.setStrategy('conductor')

    expect(events).toEqual([
      { strategy: 'single' },
      { strategy: 'conductor' },
    ])
    claw.destroy()
  })

  it('options.strategy overrides default', () => {
    globalThis.agenticAsk = () => (async function* () { yield { type: 'done', answer: 'x', rounds: 1 } })()
    const mockConductor = {
      createConductor: () => ({
        chat: () => (async function* () { yield { type: 'done', reply: 'x' } })(),
        on: () => {},
        destroy: () => {},
      }),
    }
    // Even with conductor loaded, strategy: 'single' forces single mode
    const claw = createClaw({ apiKey: 'k', conductorModule: mockConductor, strategy: 'single' })
    expect(claw.getStrategy()).toBe('single')
    claw.destroy()
  })
})
