import { describe, it, expect } from 'vitest'

// Simulate the streaming tool protocol
describe('Streaming Tool Protocol', () => {
  // Helper: create an async generator tool
  function createStreamingTool() {
    return {
      name: 'live_search',
      description: 'Search that streams results as they arrive',
      streaming: true,
      parameters: { type: 'object', properties: { query: { type: 'string' } } },
      async *execute({ query }) {
        // Simulate 3 results arriving over time
        yield { type: 'result', title: 'Result 1', snippet: `First match for ${query}` }
        yield { type: 'result', title: 'Result 2', snippet: `Second match for ${query}` }
        yield { type: 'result', title: 'Result 3', snippet: `Third match for ${query}` }
        // Final result
        yield { _final: true, result: { results: 3, query } }
      }
    }
  }

  it('async generator yields progress then final', async () => {
    const tool = createStreamingTool()
    const gen = tool.execute({ query: 'test' })
    
    const events = []
    for await (const delta of gen) {
      events.push(delta)
    }

    expect(events).toHaveLength(4)
    expect(events[0]).toEqual({ type: 'result', title: 'Result 1', snippet: 'First match for test' })
    expect(events[1]).toEqual({ type: 'result', title: 'Result 2', snippet: 'Second match for test' })
    expect(events[2]).toEqual({ type: 'result', title: 'Result 3', snippet: 'Third match for test' })
    expect(events[3]).toEqual({ _final: true, result: { results: 3, query: 'test' } })
  })

  it('detects async generator via Symbol.asyncIterator', () => {
    const tool = createStreamingTool()
    const result = tool.execute({ query: 'test' })
    expect(typeof result[Symbol.asyncIterator]).toBe('function')
  })

  it('non-streaming tool returns plain value', async () => {
    const tool = {
      name: 'simple',
      description: 'Returns immediately',
      execute: async ({ x }) => ({ doubled: x * 2 })
    }
    const result = await tool.execute({ x: 5 })
    expect(result).toEqual({ doubled: 10 })
    expect(result[Symbol.asyncIterator]).toBeUndefined()
  })

  it('streaming tool protocol: progress events + final result', async () => {
    const tool = createStreamingTool()
    const gen = tool.execute({ query: 'agentic' })

    const progress = []
    let finalResult = null

    for await (const delta of gen) {
      if (delta._final) {
        finalResult = delta.result ?? delta
      } else {
        progress.push(delta)
      }
    }

    expect(progress).toHaveLength(3)
    expect(finalResult).toEqual({ results: 3, query: 'agentic' })
  })

  it('parallel streaming tools execute concurrently', async () => {
    function createDelayedTool(name, delayMs) {
      return {
        name,
        streaming: true,
        async *execute({ query }) {
          yield { step: 1, name }
          yield { step: 2, name }
          yield { _final: true, result: { name, query } }
        }
      }
    }

    const tools = [
      createDelayedTool('search_a', 10),
      createDelayedTool('search_b', 10),
    ]

    const allEvents = []
    const results = await Promise.all(tools.map(async (tool) => {
      const events = []
      let final = null
      for await (const delta of tool.execute({ query: 'test' })) {
        if (delta._final) final = delta.result
        else events.push(delta)
      }
      allEvents.push(...events)
      return final
    }))

    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ name: 'search_a', query: 'test' })
    expect(results[1]).toEqual({ name: 'search_b', query: 'test' })
    expect(allEvents).toHaveLength(4) // 2 progress each
  })
})
