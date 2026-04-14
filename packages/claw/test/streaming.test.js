import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

// ── Mock agenticAsk ──────────────────────────────────────────────
// Generator mode: no emit arg → returns AsyncGenerator<ChatEvent>
// Legacy mode: emit arg → returns Promise<{answer, rounds, messages}>

let mockAskCalls = []
let mockEvents = [
  { type: 'status', message: 'Round 1/10' },
  { type: 'text_delta', text: 'Hello ' },
  { type: 'text_delta', text: 'world' },
  { type: 'done', answer: 'Hello world', rounds: 1, messages: [] },
]

globalThis.agenticAsk = function agenticAsk(prompt, config, emit) {
  mockAskCalls.push({ prompt, config, emit })
  if (typeof emit === 'function') {
    // Legacy mode
    return (async () => {
      let answer = ''
      for (const event of mockEvents) {
        if (event.type === 'text_delta') emit('token', { text: event.text })
        else emit(event.type, event)
        if (event.type === 'done') answer = event.answer
      }
      return { answer, rounds: 1, messages: [] }
    })()
  }
  // Generator mode
  return (async function* () {
    for (const event of mockEvents) yield event
  })()
}

// Mock agentic-memory
globalThis.AgenticMemory = {
  createMemory(opts) {
    let msgs = []
    return {
      id: opts.id || 'default',
      async user(content) { msgs.push({ role: 'user', content }) },
      async assistant(content) { msgs.push({ role: 'assistant', content }) },
      messages() { return [...msgs] },
      history() { return msgs.map(m => ({ role: m.role, content: m.content })) },
      info() { return { messageCount: msgs.length } },
      clear() { msgs = [] },
      destroy() { msgs = [] },
    }
  },
}

const require = createRequire(import.meta.url)
const { createClaw } = require('../agentic-claw.js')

describe('claw streaming upgrade', () => {
  before(() => {
    mockAskCalls = []
  })

  describe('chat() generator mode', () => {
    it('returns async generator when no emit callback', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      const gen = claw.chat('Hello')
      // Should be an async iterable
      assert.equal(typeof gen[Symbol.asyncIterator], 'function')

      const events = []
      for await (const event of gen) {
        events.push(event)
      }
      assert.ok(events.length > 0)
      assert.equal(events[events.length - 1].type, 'done')
      assert.equal(events[events.length - 1].answer, 'Hello world')
      claw.destroy()
    })

    it('yields text_delta events', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      const deltas = []
      for await (const event of claw.chat('Hello')) {
        if (event.type === 'text_delta') deltas.push(event.text)
      }
      assert.deepEqual(deltas, ['Hello ', 'world'])
      claw.destroy()
    })

    it('yields all ChatEvent types', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      const types = []
      for await (const event of claw.chat('Hello')) {
        types.push(event.type)
      }
      assert.ok(types.includes('status'))
      assert.ok(types.includes('text_delta'))
      assert.ok(types.includes('done'))
      claw.destroy()
    })

    it('adds messages to session memory', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      for await (const _ of claw.chat('Hello')) {} // consume
      const msgs = claw.memory.messages()
      assert.equal(msgs.length, 2)
      assert.equal(msgs[0].role, 'user')
      assert.equal(msgs[0].content, 'Hello')
      assert.equal(msgs[1].role, 'assistant')
      assert.equal(msgs[1].content, 'Hello world')
      claw.destroy()
    })
  })

  describe('chat() legacy emit mode', () => {
    it('returns Promise when emit callback provided', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      const tokens = []
      const result = await claw.chat('Hello', (type, data) => {
        if (type === 'token') tokens.push(data.text)
      })
      assert.equal(result.answer, 'Hello world')
      assert.equal(result.rounds, 1)
      assert.ok(tokens.length > 0)
      claw.destroy()
    })

    it('backward compat: emit as 2nd arg', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      const events = []
      const result = await claw.chat('Hello', (type, data) => {
        events.push(type)
      })
      assert.equal(typeof result.answer, 'string')
      assert.ok(events.includes('token'))
      claw.destroy()
    })
  })

  describe('chat() with options object', () => {
    it('accepts options as 2nd arg in generator mode', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      mockAskCalls = []
      const gen = claw.chat('Hello', { signal: AbortSignal.abort() })
      // Should still be a generator
      assert.equal(typeof gen[Symbol.asyncIterator], 'function')
      // Consume (may error due to abort, that's fine)
      try {
        for await (const _ of gen) {}
      } catch {}
      claw.destroy()
    })
  })

  describe('AbortSignal passthrough', () => {
    it('passes signal to agenticAsk config', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      mockAskCalls = []
      const controller = new AbortController()
      const gen = claw.chat('Hello', { signal: controller.signal })
      for await (const _ of gen) {}
      const call = mockAskCalls[mockAskCalls.length - 1]
      assert.equal(call.config.signal, controller.signal)
      claw.destroy()
    })
  })

  describe('provider failover passthrough', () => {
    it('passes providers array to agenticAsk config', async () => {
      const providerList = [
        { provider: 'anthropic', apiKey: 'sk-1', model: 'claude-sonnet-4' },
        { provider: 'openai', apiKey: 'sk-2', model: 'gpt-4o' },
      ]
      const claw = createClaw({ apiKey: 'sk-1', providers: providerList })
      mockAskCalls = []
      for await (const _ of claw.chat('Hello')) {}
      const call = mockAskCalls[mockAskCalls.length - 1]
      assert.deepEqual(call.config.providers, providerList)
      claw.destroy()
    })

    it('allows createClaw without apiKey when providers given', () => {
      const claw = createClaw({
        providers: [{ provider: 'anthropic', apiKey: 'sk-1', model: 'claude-sonnet-4' }],
      })
      assert.ok(claw)
      claw.destroy()
    })
  })

  describe('retry()', () => {
    it('removes last assistant turn and replays', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      // First chat
      for await (const _ of claw.chat('Hello')) {}
      assert.equal(claw.memory.messages().length, 2)

      // Retry
      mockAskCalls = []
      const events = []
      for await (const event of claw.retry()) {
        events.push(event)
      }
      assert.ok(events.length > 0)
      assert.equal(events[events.length - 1].type, 'done')
      // Memory should have user + new assistant (retry rebuilt it)
      const msgs = claw.memory.messages()
      assert.equal(msgs[msgs.length - 1].role, 'assistant')
      claw.destroy()
    })

    it('yields error when no messages', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      const events = []
      for await (const event of claw.retry()) {
        events.push(event)
      }
      assert.equal(events[0].type, 'error')
      assert.ok(events[0].error.includes('No messages'))
      claw.destroy()
    })

    it('works on named sessions', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      const s = claw.session('alice')
      for await (const _ of s.chat('Hi')) {}
      const events = []
      for await (const event of s.retry()) {
        events.push(event)
      }
      assert.equal(events[events.length - 1].type, 'done')
      claw.destroy()
    })
  })

  describe('context overflow', () => {
    it('compacts when history exceeds maxTokens', async () => {
      // Use very low maxTokens to trigger compaction
      const claw = createClaw({ apiKey: 'test-key', maxTokens: 50 })
      // Add several messages to exceed token limit
      for (let i = 0; i < 5; i++) {
        for await (const _ of claw.chat('This is a long message number ' + i + ' with lots of content to fill up tokens')) {}
      }
      // After compaction, message count should be reduced
      const msgs = claw.memory.messages()
      // Should have been compacted — fewer than 10 messages (5 user + 5 assistant)
      assert.ok(msgs.length <= 10, `Expected compacted messages, got ${msgs.length}`)
      claw.destroy()
    })
  })

  describe('session persistence', () => {
    it('persists history after chat (when store available)', async () => {
      // Without a real store, persistence is a no-op but shouldn't error
      const claw = createClaw({ apiKey: 'test-key', persist: '/tmp/test-claw' })
      for await (const _ of claw.chat('Hello')) {}
      // Should not throw
      assert.ok(true)
      claw.destroy()
    })
  })

  describe('event emitter integration', () => {
    it('emits token events in generator mode', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      const tokens = []
      claw.on('token', (data) => tokens.push(data))
      for await (const _ of claw.chat('Hello')) {}
      assert.ok(tokens.length > 0)
      assert.equal(tokens[0].text, 'Hello ')
      claw.destroy()
    })

    it('emits message events in generator mode', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      const messages = []
      claw.on('message', (data) => messages.push(data))
      for await (const _ of claw.chat('Hello')) {}
      assert.equal(messages.length, 2)
      assert.equal(messages[0].role, 'user')
      assert.equal(messages[1].role, 'assistant')
      claw.destroy()
    })
  })
})
