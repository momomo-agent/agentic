// Tests that abort signal terminates the core generator during tool execution.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as core from '../src/index.js'

let providerCallCount = 0

beforeEach(() => {
  providerCallCount = 0
  core.registerProvider('test-abort', async ({ messages }) => {
    providerCallCount++
    return {
      content: [{ type: 'text', text: 'calling tool' }],
      tool_calls: [{ id: `call_${providerCallCount}`, name: 'slow_tool', input: {} }],
      stop_reason: 'tool_use',
    }
  })
})

afterEach(() => {
  core.unregisterProvider('test-abort')
})

describe('core abort during tool execution', () => {
  it('abort signal terminates generator while tool is running', async () => {
    const controller = new AbortController()
    let toolStarted = false

    const config = {
      provider: 'test-abort',
      apiKey: 'k',
      tools: [{
        name: 'slow_tool',
        description: 'A tool that takes forever',
        input_schema: { type: 'object', properties: {} },
        execute: async () => {
          toolStarted = true
          // Simulate a tool that never completes
          await new Promise(() => {})
        },
      }],
      stream: false,
      signal: controller.signal,
    }

    const events = []
    const gen = core.agenticAsk('do something', config)

    // Consume events until we know the tool started, then abort
    const timeout = setTimeout(() => controller.abort(), 50)

    for await (const evt of gen) {
      events.push(evt)
      if (evt.type === 'error') break
    }
    clearTimeout(timeout)

    expect(toolStarted).toBe(true)
    const errorEvt = events.find(e => e.type === 'error')
    expect(errorEvt).toBeDefined()
    expect(errorEvt.error).toBe('aborted')
  })

  it('abort signal terminates generator during LLM call (non-streaming)', async () => {
    const controller = new AbortController()
    core.unregisterProvider('test-abort')
    core.registerProvider('test-abort', async () => {
      // Simulate a slow LLM response
      await new Promise(() => {})
    })

    const config = {
      provider: 'test-abort',
      apiKey: 'k',
      tools: [],
      stream: false,
      signal: controller.signal,
    }

    // Abort after 30ms
    setTimeout(() => controller.abort(), 30)

    const events = []
    for await (const evt of core.agenticAsk('hi', config)) {
      events.push(evt)
    }

    const errorEvt = events.find(e => e.type === 'error')
    expect(errorEvt).toBeDefined()
    expect(errorEvt.error).toContain('Aborted')
  })

  it('generator terminates promptly (under 200ms) after abort', async () => {
    const controller = new AbortController()

    const config = {
      provider: 'test-abort',
      apiKey: 'k',
      tools: [{
        name: 'slow_tool',
        description: 'slow',
        input_schema: { type: 'object', properties: {} },
        execute: async () => { await new Promise(() => {}) },
      }],
      stream: false,
      signal: controller.signal,
    }

    const gen = core.agenticAsk('go', config)
    const iter = gen[Symbol.asyncIterator]()

    // Consume until tool_use event
    let evt
    do { evt = (await iter.next()).value } while (evt && evt.type !== 'tool_use')
    expect(evt?.type).toBe('tool_use')

    // Abort and measure how long until generator terminates
    const t0 = Date.now()
    controller.abort()
    const result = await iter.next()
    const elapsed = Date.now() - t0

    expect(elapsed).toBeLessThan(200)
    // Should get error event or done
    expect(result.value?.type === 'error' || result.done).toBe(true)
  })
})
