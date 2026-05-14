// Tests for turn-boundary steering injection in agenticAsk.
// Mocks the LLM via registerProvider so we control round/done flow.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as core from '../src/index.js'

beforeEach(() => {
  core.registerProvider('test-steer', async ({ messages }) => {
    // No tool_calls -> agenticAsk treats as end_turn after this round.
    const last = messages[messages.length - 1]
    const echo = typeof last?.content === 'string' ? last.content : JSON.stringify(last?.content)
    return {
      content: [{ type: 'text', text: `echo:${echo}` }],
      tool_calls: [],
      stop_reason: 'end_turn',
    }
  })
})

afterEach(() => {
  core.unregisterProvider('test-steer')
})

const baseConfig = {
  provider: 'test-steer',
  apiKey: 'k',
  tools: [],
  stream: false,
}

async function drain(gen) {
  const events = []
  for await (const evt of gen) events.push(evt)
  return events
}

describe('agenticAsk steer hook', () => {
  it('does not interfere when no steer config is provided', async () => {
    const events = await drain(core.agenticAsk('hi', baseConfig))
    expect(events.find(e => e.type === 'steered')).toBeUndefined()
    expect(events.find(e => e.type === 'done')).toBeDefined()
  })

  it('drains queue at first round and injects messages', async () => {
    const queue = ['hold on, also do X']
    const drained = []
    const events = await drain(core.agenticAsk('hi', {
      ...baseConfig,
      steer: {
        drain: () => {
          const out = queue.splice(0)
          drained.push(...out)
          return out
        },
      },
    }))
    const steered = events.find(e => e.type === 'steered')
    expect(steered).toBeDefined()
    expect(steered.count).toBe(1)
    expect(steered.round).toBe(1)
    expect(steered.messages).toEqual(['hold on, also do X'])
    expect(drained).toEqual(['hold on, also do X'])
  })

  it('skips empty queue and produces no steered event', async () => {
    const events = await drain(core.agenticAsk('hi', {
      ...baseConfig,
      steer: { drain: () => [] },
    }))
    expect(events.find(e => e.type === 'steered')).toBeUndefined()
    expect(events.find(e => e.type === 'done')).toBeDefined()
  })

  it('tolerates drain throwing without crashing the run', async () => {
    const events = await drain(core.agenticAsk('hi', {
      ...baseConfig,
      steer: { drain: () => { throw new Error('boom') } },
    }))
    expect(events.find(e => e.type === 'steered')).toBeUndefined()
    expect(events.find(e => e.type === 'done')).toBeDefined()
  })

  it('accepts string and { content } items, drops empty/null', async () => {
    let called = 0
    const events = await drain(core.agenticAsk('hi', {
      ...baseConfig,
      steer: {
        drain: () => {
          called++
          return called === 1
            ? ['plain string', { content: 'object form' }, null, '', { content: '' }]
            : []
        },
      },
    }))
    const steered = events.find(e => e.type === 'steered')
    expect(steered).toBeDefined()
    expect(steered.count).toBe(2)
    expect(steered.messages).toEqual(['plain string', 'object form'])
  })

  it('fires onInjected callback after injection', async () => {
    const seen = []
    await drain(core.agenticAsk('hi', {
      ...baseConfig,
      steer: {
        drain: () => ['x'],
        onInjected: ({ round, messages }) => seen.push({ round, messages }),
      },
    }))
    expect(seen).toEqual([{ round: 1, messages: ['x'] }])
  })
})
