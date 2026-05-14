// Integration test: steer injection at various stages of a multi-round conversation.
// Simulates real usage: user sends follow-up while AI is mid-reply.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as core from '../src/index.js'

// Controllable provider that can:
// 1. Pause mid-stream (simulate slow streaming)
// 2. Return tool calls (simulate tool execution rounds)
// 3. Return end_turn (simulate completion)
let providerBehavior = []
let providerCallCount = 0

beforeEach(() => {
  providerCallCount = 0
  providerBehavior = []
  core.registerProvider('test-integration', async ({ messages }) => {
    providerCallCount++
    const behavior = providerBehavior[providerCallCount - 1] || { type: 'end_turn' }
    const last = messages[messages.length - 1]
    const lastText = typeof last?.content === 'string' ? last.content : (last?.content?.[0]?.text || 'empty')

    if (behavior.type === 'tool_call') {
      return {
        content: [{ type: 'text', text: behavior.text || `thinking...` }],
        tool_calls: [{ id: `call_${providerCallCount}`, name: behavior.toolName || 'search', input: behavior.toolInput || {} }],
        stop_reason: 'tool_use',
      }
    }
    return {
      content: [{ type: 'text', text: behavior.text || `reply_${providerCallCount}:${lastText}` }],
      tool_calls: [],
      stop_reason: 'end_turn',
    }
  })
})

afterEach(() => {
  core.unregisterProvider('test-integration')
})

const baseConfig = {
  provider: 'test-integration',
  apiKey: 'k',
  tools: [{
    name: 'search',
    description: 'Search the web',
    input_schema: { type: 'object', properties: { q: { type: 'string' } } },
    execute: async (input) => `results for: ${input.q || 'default'}`,
  }],
  stream: false,
}

async function collectEvents(gen) {
  const events = []
  for await (const evt of gen) events.push(evt)
  return events
}

describe('steer integration: injection at various stages', () => {

  it('Scenario 1: message queued BEFORE first LLM call (top-of-loop drain)', async () => {
    // User sends "hello", then immediately "also in Chinese" before LLM responds
    providerBehavior = [
      { type: 'end_turn' }, // round 1: processes "also in Chinese" (injected at top)
      { type: 'end_turn' }, // round 2: final
    ]

    let drainCount = 0
    const events = await collectEvents(core.agenticAsk('hello', {
      ...baseConfig,
      steer: {
        drain: () => {
          drainCount++
          // Simulate: message arrives before first LLM call
          if (drainCount === 1) return ['also in Chinese']
          return []
        },
      },
    }))

    const steered = events.filter(e => e.type === 'steered')
    expect(steered.length).toBe(1)
    expect(steered[0].round).toBe(1)
    expect(steered[0].messages).toEqual(['also in Chinese'])
    // LLM was called twice (round 1 with injected msg, round 2 after end_turn)
    // Actually: injection at top of round 1 means round 1 sees the injected message
    expect(providerCallCount).toBeGreaterThanOrEqual(1)
  })

  it('Scenario 2: message queued DURING tool execution (drain at next round top)', async () => {
    // Round 1: LLM calls search tool
    // While tool executes, user sends "and summarize it"
    // Round 2: drain picks it up at top of loop
    providerBehavior = [
      { type: 'tool_call', text: 'let me search', toolName: 'search', toolInput: { q: 'news' } },
      { type: 'end_turn', text: 'here are results + summary' },
      { type: 'end_turn', text: 'final with summary' },
    ]

    let drainCount = 0
    const events = await collectEvents(core.agenticAsk('search news', {
      ...baseConfig,
      steer: {
        drain: () => {
          drainCount++
          // Message arrives during tool execution (between round 1 and round 2)
          if (drainCount === 2) return ['and summarize it']
          return []
        },
      },
    }))

    const steered = events.filter(e => e.type === 'steered')
    expect(steered.length).toBe(1)
    expect(steered[0].messages).toEqual(['and summarize it'])
    // Tool was executed
    const toolResults = events.filter(e => e.type === 'tool_result')
    expect(toolResults.length).toBe(1)
    expect(providerCallCount).toBeGreaterThanOrEqual(2)
  })

  it('Scenario 3: message queued AT end_turn (the bug fix)', async () => {
    // Round 1: LLM returns end_turn (pure text, no tools)
    // At that moment, user has queued a message
    // Should NOT break — should inject and continue
    providerBehavior = [
      { type: 'end_turn', text: 'here is the news' },
      { type: 'end_turn', text: 'here is the news translated' },
    ]

    let drainCount = 0
    const events = await collectEvents(core.agenticAsk('search news', {
      ...baseConfig,
      steer: {
        drain: () => {
          drainCount++
          // First drain (top of round 1): empty
          // Second drain (end_turn of round 1): message waiting!
          if (drainCount === 2) return ['translate to Chinese']
          return []
        },
      },
    }))

    const steered = events.filter(e => e.type === 'steered')
    expect(steered.length).toBe(1)
    expect(steered[0].messages).toEqual(['translate to Chinese'])
    // Two LLM calls: original + continuation after injection
    expect(providerCallCount).toBe(2)
    // Final answer should be from round 2
    const done = events.find(e => e.type === 'done')
    const answerText = typeof done.answer === 'string' ? done.answer : done.answer?.map(b => b.text).join('')
    expect(answerText).toContain('translated')
  })

  it('Scenario 4: message queued after tool round end_turn (combined)', async () => {
    // Round 1: tool call
    // Round 2: end_turn (after tool result)
    // At end_turn of round 2, user queues message
    // Round 3: processes the queued message
    providerBehavior = [
      { type: 'tool_call', text: 'searching', toolName: 'search', toolInput: { q: 'weather' } },
      { type: 'end_turn', text: 'weather is sunny' },
      { type: 'end_turn', text: 'weather is sunny, dress light' },
    ]

    let drainCount = 0
    const events = await collectEvents(core.agenticAsk('weather today', {
      ...baseConfig,
      steer: {
        drain: () => {
          drainCount++
          // drain calls: top-r1, top-r2, end_turn-r2
          // Message arrives at end_turn of round 2
          if (drainCount === 3) return ['what should I wear?']
          return []
        },
      },
    }))

    const steered = events.filter(e => e.type === 'steered')
    expect(steered.length).toBe(1)
    expect(steered[0].messages).toEqual(['what should I wear?'])
    expect(providerCallCount).toBe(3) // tool round + end_turn + continuation
  })

  it('Scenario 5: multiple messages queued at different points', async () => {
    // Round 1: tool call
    // During tool: user sends msg A
    // Round 2: end_turn
    // At end_turn: user sends msg B
    // Round 3: end_turn (no more messages)
    providerBehavior = [
      { type: 'tool_call', text: 'searching', toolName: 'search', toolInput: { q: 'test' } },
      { type: 'end_turn', text: 'found results' },
      { type: 'end_turn', text: 'results + both additions' },
    ]

    let drainCount = 0
    const events = await collectEvents(core.agenticAsk('find stuff', {
      ...baseConfig,
      steer: {
        drain: () => {
          drainCount++
          if (drainCount === 2) return ['add context A']  // top of round 2
          if (drainCount === 3) return ['add context B']  // end_turn of round 2
          return []
        },
      },
    }))

    const steered = events.filter(e => e.type === 'steered')
    expect(steered.length).toBe(2)
    expect(steered[0].messages).toEqual(['add context A'])
    expect(steered[1].messages).toEqual(['add context B'])
    expect(providerCallCount).toBe(3)
  })

  it('Scenario 6: no queued messages at any point — normal flow unchanged', async () => {
    providerBehavior = [
      { type: 'tool_call', text: 'searching', toolName: 'search', toolInput: { q: 'x' } },
      { type: 'end_turn', text: 'done' },
    ]

    const events = await collectEvents(core.agenticAsk('do something', {
      ...baseConfig,
      steer: { drain: () => [] },
    }))

    const steered = events.filter(e => e.type === 'steered')
    expect(steered.length).toBe(0)
    expect(providerCallCount).toBe(2) // tool round + final
    const done = events.find(e => e.type === 'done')
    expect(done).toBeDefined()
  })

  it('Scenario 7: drain throws at end_turn — gracefully breaks without crash', async () => {
    providerBehavior = [
      { type: 'end_turn', text: 'normal reply' },
    ]

    let drainCount = 0
    const events = await collectEvents(core.agenticAsk('hi', {
      ...baseConfig,
      steer: {
        drain: () => {
          drainCount++
          if (drainCount === 2) throw new Error('queue crashed')
          return []
        },
      },
    }))

    // Should complete normally despite drain error
    const done = events.find(e => e.type === 'done')
    expect(done).toBeDefined()
    expect(providerCallCount).toBe(1)
  })
})
