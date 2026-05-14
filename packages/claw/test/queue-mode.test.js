// Tests for session.setQueueMode() / mid-turn message handling.
// We mock askFn (agenticAsk) to expose a controllable async generator so we
// can pause mid-stream, send a second chat() during isGenerating, and assert
// queue / interrupt / block behavior.
//
// Note: we pass conductorModule:{} to createClaw so the Conductor path is
// disabled (vitest's pnpm workspace resolves agentic-conductor by default,
// which would otherwise wrap our fake askFn).
import { describe, it, expect, beforeEach } from 'vitest'

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

// Each test gets a fresh ask state via setupAsk()
let askConfigs
let askGate
let askInjectionCheck
function setupAsk() {
  askConfigs = []
  askGate = null
  askInjectionCheck = null
  globalThis.agenticAsk = (input, config) => {
    askConfigs.push(config)
    return (async function* () {
      yield { type: 'status', message: 'r1' }
      yield { type: 'text_delta', text: 'thinking' }
      if (askGate) await askGate
      // Mimic core's turn-boundary drain to verify injection
      if (config.steer && typeof config.steer.drain === 'function') {
        const queued = config.steer.drain()
        if (queued.length && askInjectionCheck) askInjectionCheck(queued)
      }
      yield { type: 'done', answer: `final:${input}`, rounds: 1, messages: [] }
    })()
  }
}

const { createClaw } = await import('../src/index.js')

beforeEach(() => {
  setupAsk()
})

function makeClaw(opts = {}) {
  return createClaw({ apiKey: 'k', conductorModule: {}, ...opts })
}

async function startAndPause(session, input, releaseRef) {
  let release
  askGate = new Promise(r => { release = r })
  releaseRef.release = release
  const gen = session.chat(input)
  const iter = gen[Symbol.asyncIterator]()
  await iter.next() // status
  await iter.next() // text_delta
  return iter
}

async function drain(iter) {
  for await (const _ of { [Symbol.asyncIterator]: () => iter }) {}
}

describe('claw session.setQueueMode + steer queue', () => {
  it('default queueMode is block', () => {
    const claw = makeClaw()
    expect(claw.session().getQueueMode()).toBe('block')
    claw.destroy()
  })

  it('createClaw({ queueMode: "steer" }) becomes the default', () => {
    const claw = makeClaw({ queueMode: 'steer' })
    expect(claw.session().getQueueMode()).toBe('steer')
    claw.destroy()
  })

  it('rejects invalid queueMode', () => {
    const claw = makeClaw()
    expect(() => claw.session().setQueueMode('weird')).toThrow(/Invalid queueMode/)
    claw.destroy()
  })

  it('setQueueMode is per-session', () => {
    const claw = makeClaw()
    const a = claw.session('a')
    const b = claw.session('b')
    a.setQueueMode('steer')
    expect(a.getQueueMode()).toBe('steer')
    expect(b.getQueueMode()).toBe('block')
    claw.destroy()
  })

  it('steer mode queues mid-turn message and drains at boundary', async () => {
    const claw = makeClaw()
    const session = claw.session()
    session.setQueueMode('steer')

    const injected = []
    askInjectionCheck = (q) => injected.push(...q)
    const queuedEvents = []
    claw.on('queued', e => queuedEvents.push(e))

    const ref = {}
    const iter = await startAndPause(session, 'first', ref)
    expect(session.isGenerating).toBe(true)
    expect(askConfigs.length).toBe(1)

    // Second chat() while generating -> queue, no new run
    const result2 = session.chat('also do X')
    expect(session.queueDepth()).toBe(1)
    expect(askConfigs.length).toBe(1)
    expect(queuedEvents).toEqual([{ sessionId: 'default', content: 'also do X', depth: 1 }])

    const r2 = await result2
    expect(r2.queued).toBe(true)
    expect(r2.depth).toBe(1)

    ref.release()
    await drain(iter)
    expect(injected).toEqual(['also do X'])
    expect(session.queueDepth()).toBe(0)
    expect(session.isGenerating).toBe(false)
    claw.destroy()
  })

  it('steer mode queues multiple messages, all drained at boundary', async () => {
    const claw = makeClaw({ queueMode: 'steer' })
    const session = claw.session()

    const injected = []
    askInjectionCheck = (q) => injected.push(...q)

    const ref = {}
    const iter = await startAndPause(session, 'first', ref)
    session.chat('a'); session.chat('b'); session.chat('c')
    expect(session.queueDepth()).toBe(3)

    ref.release()
    await drain(iter)
    expect(injected).toEqual(['a', 'b', 'c'])
    claw.destroy()
  })

  it('clearQueue() drops pending messages', async () => {
    const claw = makeClaw({ queueMode: 'steer' })
    const session = claw.session()

    const injected = []
    askInjectionCheck = (q) => injected.push(...q)

    const ref = {}
    const iter = await startAndPause(session, 'first', ref)
    session.chat('drop me')
    expect(session.queueDepth()).toBe(1)
    session.clearQueue()
    expect(session.queueDepth()).toBe(0)

    ref.release()
    await drain(iter)
    expect(injected).toEqual([])
    claw.destroy()
  })

  it('interrupt mode aborts current run and starts fresh', async () => {
    const claw = makeClaw({ queueMode: 'interrupt' })
    const session = claw.session()
    const aborts = []
    claw.on('abort', e => aborts.push(e))

    const ref = {}
    const iter = await startAndPause(session, 'first', ref)
    expect(session.isGenerating).toBe(true)

    // Second chat -> aborts first, returns a fresh wrapper. Generator is
    // lazy so we need to start consuming gen2 to actually invoke askFn.
    const gen2 = session.chat('replace')
    expect(aborts.length).toBe(1)
    expect(aborts[0].reason).toBe('interrupt')

    // Drain the aborted first run before consuming gen2
    ref.release()
    await drain(iter)

    // Now consume gen2 -> askFn called second time
    askGate = null
    for await (const _ of gen2) {}
    expect(askConfigs.length).toBe(2)
    claw.destroy()
  })

  it('per-call queueMode option overrides session-level setting', async () => {
    const claw = makeClaw() // default block
    const session = claw.session()

    const ref = {}
    const iter = await startAndPause(session, 'first', ref)
    expect(session.isGenerating).toBe(true)

    session.chat('queued', { queueMode: 'steer' })
    expect(session.queueDepth()).toBe(1)

    session.clearQueue()
    ref.release()
    await drain(iter)
    claw.destroy()
  })
})
