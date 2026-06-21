import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { agenticAsk, classifyError, buildToolResults, toolRegistry, registerProvider, unregisterProvider } from '../src/index.js'

async function collect(gen) {
  const events = []
  for await (const event of gen) events.push(event)
  return events
}

function streamEvents(events) {
  return (async function* () {
    for (const event of events) {
      if (event instanceof Error) throw event
      yield event
    }
  })()
}

describe('agentic-core', () => {
  let originalFetch
  let originalGateway

  afterEach(() => {
    unregisterProvider('test-retry')
    unregisterProvider('test-continuation')
    unregisterProvider('test-transform-tool-content')
    unregisterProvider('test-tool-input')
    unregisterProvider('test-object-prompt')
    unregisterProvider('test-model-lifecycle')
    unregisterProvider('test-model-lifecycle-idle')
    unregisterProvider('test-model-lifecycle-ok')
    unregisterProvider('test-tool-contract-repair')
    globalThis.fetch = originalFetch
    globalThis.__BRICK_MODEL_GATEWAY__ = originalGateway
  })

  beforeEach(() => {
    originalFetch = globalThis.fetch
    originalGateway = globalThis.__BRICK_MODEL_GATEWAY__
    globalThis.__BRICK_MODEL_GATEWAY__ = null
  })

  describe('classifyError', () => {
    it('should classify auth errors', () => {
      expect(classifyError({ message: 'Unauthorized', status: 401 })).toEqual({ category: 'auth', retryable: false })
      expect(classifyError({ message: 'Forbidden', status: 403 })).toEqual({ category: 'auth', retryable: false })
      expect(classifyError({ message: 'Invalid API key' })).toEqual({ category: 'auth', retryable: false })
    })

    it('should classify billing errors', () => {
      expect(classifyError({ message: 'Quota exceeded', status: 402 })).toEqual({ category: 'billing', retryable: false })
      expect(classifyError({ message: 'Insufficient funds' })).toEqual({ category: 'billing', retryable: false })
    })

    it('should classify rate limit errors', () => {
      const r = classifyError({ message: 'Rate limit exceeded', status: 429 })
      expect(r.category).toBe('rate_limit')
      expect(r.retryable).toBe(true)
    })

    it('should classify context overflow', () => {
      const r = classifyError({ message: 'Context length exceeded' })
      expect(r.category).toBe('context_overflow')
      expect(r.retryable).toBe(false)
    })

    it('should classify server errors', () => {
      expect(classifyError({ status: 500 }).category).toBe('server')
      expect(classifyError({ status: 502 }).category).toBe('server')
      expect(classifyError({ status: 529 }).category).toBe('server')
      expect(classifyError({ status: 500 }).retryable).toBe(true)
    })

    it('should classify network errors', () => {
      expect(classifyError({ message: 'ECONNREFUSED' }).category).toBe('network')
      expect(classifyError({ message: 'fetch failed' }).category).toBe('network')
      expect(classifyError({ message: 'ETIMEDOUT' }).retryable).toBe(true)
      expect(classifyError({ message: 'terminated' })).toEqual({ category: 'network', retryable: true })
      expect(classifyError({ message: 'other side closed' })).toEqual({ category: 'network', retryable: true })
      expect(classifyError({ message: 'UND_ERR_SOCKET' })).toEqual({ category: 'network', retryable: true })
    })

    it('should classify unknown errors', () => {
      expect(classifyError({ message: 'something weird' })).toEqual({ category: 'unknown', retryable: false })
      expect(classifyError(null)).toEqual({ category: 'unknown', retryable: false })
    })

    it('should handle string errors', () => {
      expect(classifyError('rate limit').category).toBe('rate_limit')
    })
  })

  describe('model retry', () => {
    it('retries retryable streaming failures before visible progress', async () => {
      let calls = 0
      registerProvider('test-retry', () => {
        calls++
        if (calls === 1) return streamEvents([new Error('fetch failed')])
        return streamEvents([{ type: 'text_delta', text: 'ok' }])
      })

      const events = await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'test-retry',
        tools: [],
        stream: true,
        retries: 1,
        retryDelayMs: 0,
      }))

      expect(calls).toBe(2)
      expect(events.some(e => e.type === 'status' && /Retrying model request/.test(e.message))).toBe(true)
      expect(events.find(e => e.type === 'done')?.answer).toBe('ok')
    })

    it('does not retry streaming failures after visible progress', async () => {
      let calls = 0
      registerProvider('test-retry', () => {
        calls++
        return streamEvents([{ type: 'text_delta', text: 'partial' }, new Error('fetch failed')])
      })

      const events = await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'test-retry',
        tools: [],
        stream: true,
        retries: 1,
        retryDelayMs: 0,
      }))

      expect(calls).toBe(1)
      expect(events.find(e => e.type === 'text_delta')?.text).toBe('partial')
      const error = events.find(e => e.type === 'error')
      expect(error).toMatchObject({ category: 'network', retryable: true, attempts: 1, retries: 1 })
    })

    it('adds safe diagnostics to model error events', async () => {
      registerProvider('test-retry', () => {
        const error = new Error('terminated')
        error.cause = { code: 'UND_ERR_SOCKET', name: 'SocketError', message: 'other side closed' }
        error.provider = 'openai'
        error.baseUrlHost = 'node-hk.sssaicode.com'
        error.urlHost = 'node-hk.sssaicode.com'
        error.requestBytes = 2048
        return streamEvents([error])
      })

      const events = await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'test-retry',
        tools: [],
        stream: true,
        retries: 0,
        retryDelayMs: 0,
      }))

      expect(events.find(e => e.type === 'error')).toMatchObject({
        type: 'error',
        error: 'terminated',
        category: 'network',
        retryable: true,
        attempts: 1,
        retries: 0,
        causeCode: 'UND_ERR_SOCKET',
        causeName: 'SocketError',
        causeMessage: 'other side closed',
        provider: 'openai',
        baseUrlHost: 'node-hk.sssaicode.com',
        urlHost: 'node-hk.sssaicode.com',
        requestBytes: 2048,
      })
    })
  })

  describe('token budgets and Anthropic system blocks', () => {
    function mockAnthropicFetch(calls) {
      globalThis.fetch = async (url, opts) => {
        calls.push({ url, opts, body: JSON.parse(opts.body) })
        return {
          ok: true,
          status: 200,
          headers: {},
          text: async () => JSON.stringify({
            content: [{ type: 'text', text: 'ok' }],
            stop_reason: 'end_turn',
          }),
          json: async () => ({
            content: [{ type: 'text', text: 'ok' }],
            stop_reason: 'end_turn',
          }),
        }
      }
    }

    it('uses outputMaxTokens for Anthropic max_tokens and clamps excessive values', async () => {
      const calls = []
      mockAnthropicFetch(calls)

      await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'anthropic',
        model: 'claude-test',
        tools: [],
        stream: false,
        outputMaxTokens: 4096,
        maxTokens: 200000,
      }))

      await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'anthropic',
        model: 'claude-test',
        tools: [],
        stream: false,
        outputMaxTokens: 200000,
      }))

      expect(calls[0].body.max_tokens).toBe(4096)
      expect(calls[1].body.max_tokens).toBe(32000)
      expect(calls.map(call => call.body.max_tokens)).not.toContain(200000)
    })

    it('keeps maxTokens as a legacy output budget alias', async () => {
      const calls = []
      mockAnthropicFetch(calls)

      await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'anthropic',
        model: 'claude-test',
        tools: [],
        stream: false,
        maxTokens: 50,
      }))

      expect(calls[0].body.max_tokens).toBe(50)
    })

    it('normalizes Anthropic system strings and structured blocks without adding cache_control', async () => {
      const calls = []
      mockAnthropicFetch(calls)

      await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'anthropic',
        model: 'claude-test',
        tools: [],
        stream: false,
        system: 'legacy system',
      }))

      await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'anthropic',
        model: 'claude-test',
        tools: [],
        stream: false,
        system: [
          { type: 'text', text: 'stable', cache_control: { type: 'ephemeral' }, name: 'debug-stable' },
          { type: 'text', text: 'dynamic', stability: 'dynamic' },
        ],
      }))

      expect(calls[0].body.system).toEqual([
        { type: 'text', text: 'legacy system', cache_control: { type: 'ephemeral' } },
      ])
      expect(calls[1].body.system).toEqual([
        { type: 'text', text: 'stable', cache_control: { type: 'ephemeral' } },
        { type: 'text', text: 'dynamic' },
      ])
      expect(calls[1].body.system[0].name).toBeUndefined()
      expect(calls[1].body.system[1].stability).toBeUndefined()
      expect(calls[1].body.system[1].cache_control).toBeUndefined()
    })
  })

  describe('tool input hashing', () => {
    it('does not crash loop detection when a model returns a tool call with missing input', async () => {
      let calls = 0
      const seenInputs = []
      registerProvider('test-tool-input', () => {
        calls++
        if (calls === 1) {
          return {
            content: 'calling tool',
            tool_calls: [{ id: 'tc_missing_input', name: 'no_args' }],
            stop_reason: 'tool_use',
          }
        }
        return { content: 'done', tool_calls: [], stop_reason: 'stop' }
      })

      const events = await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'test-tool-input',
        tools: [{
          name: 'no_args',
          description: 'Tool with no input from the model',
          input_schema: { type: 'object', properties: {} },
          execute: async input => {
            seenInputs.push(input)
            return 'ok'
          },
        }],
        stream: false,
      }))

      expect(seenInputs).toEqual([undefined])
      expect(events.find(e => e.type === 'tool_use')).toMatchObject({
        id: 'tc_missing_input',
        name: 'no_args',
      })
      expect(events.find(e => e.type === 'done')?.answer).toBe('done')
      expect(events.find(e => /charCodeAt/.test(String(e.error || e.message || '')))).toBeUndefined()
    })

    it('repairs invalid tool calls internally without emitting visible tool events or executing tools', async () => {
      let calls = 0
      const executed = {
        bash: 0,
        read_image: 0,
        memory_search: 0,
      }
      registerProvider('test-tool-contract-repair', ({ messages }) => {
        calls++
        if (calls === 1) {
          return {
            content: '',
            tool_calls: [
              { id: 'tc_bash_empty', name: 'bash', input: {} },
              { id: 'tc_read_image_empty', name: 'read_image', input: {} },
              { id: 'tc_memory_empty', name: 'memory_search', input: {} },
            ],
            stop_reason: 'tool_use',
          }
        }
        if (calls === 3) {
          expect(messages.at(-1)).toMatchObject({ role: 'tool', tool_call_id: 'tc_bash_ok' })
          return { content: 'done', tool_calls: [], stop_reason: 'stop' }
        }
        expect(messages.at(-1)).toMatchObject({ role: 'system', metadata: { internal: true, kind: 'tool_contract_repair' } })
        expect(messages.at(-1).content).toContain('Tool call arguments failed schema validation')
        expect(messages.at(-1).content).toContain('Tool: bash')
        expect(messages.at(-1).content).toContain('Minimal valid call')
        return {
          content: 'running fixed call',
          tool_calls: [{ id: 'tc_bash_ok', name: 'bash', input: { command: 'pwd', label: 'print cwd' } }],
          stop_reason: 'tool_use',
        }
      })

      const events = await collect(agenticAsk('run tools', {
        apiKey: 'sk-test',
        provider: 'test-tool-contract-repair',
        tools: [
          {
            name: 'bash',
            description: 'Run shell',
            parameters: {
              type: 'object',
              properties: {
                command: { type: 'string' },
                label: { type: 'string' },
              },
              required: ['command', 'label'],
            },
            execute: async () => {
              executed.bash++
              return { output: 'ok' }
            },
          },
          {
            name: 'read_image',
            description: 'Read image',
            parameters: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                prompt: { type: 'string' },
              },
              required: ['path'],
            },
            execute: async () => {
              executed.read_image++
              return { output: 'image' }
            },
          },
          {
            name: 'memory_search',
            description: 'Search memory',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' },
              },
              required: ['query'],
            },
            execute: async () => {
              executed.memory_search++
              return { output: 'memory' }
            },
          },
        ],
        stream: false,
      }))

      const toolUses = events.filter(e => e.type === 'tool_use')
      expect(toolUses.map(e => e.id)).toEqual(['tc_bash_ok'])
      expect(events.some(e => e.type === 'tool_result' && e.id === 'tc_bash_ok')).toBe(true)
      expect(events.some(e => e.type === 'tool_error')).toBe(false)
      expect(executed).toEqual({ bash: 1, read_image: 0, memory_search: 0 })
    })


    it('does not repair already valid tool calls', async () => {
      let calls = 0
      let executed = 0
      registerProvider('test-tool-contract-valid-direct', ({ messages }) => {
        calls++
        expect(messages.map(m => String(m.content || '')).join('\n')).not.toContain('Tool call arguments failed schema validation')
        if (calls === 1) {
          return {
            content: '',
            tool_calls: [{ id: 'tc_valid', name: 'bash', input: { command: 'pwd', label: 'print cwd' } }],
            stop_reason: 'tool_use',
          }
        }
        expect(messages.at(-1)).toMatchObject({ role: 'tool', tool_call_id: 'tc_valid' })
        return { content: 'done', tool_calls: [], stop_reason: 'stop' }
      })

      const events = await collect(agenticAsk('run one valid tool', {
        apiKey: 'sk-test',
        provider: 'test-tool-contract-valid-direct',
        tools: [{
          name: 'bash',
          description: 'Run shell',
          parameters: {
            type: 'object',
            properties: { command: { type: 'string' }, label: { type: 'string' } },
            required: ['command', 'label'],
          },
          execute: async () => { executed++; return { output: 'ok' } },
        }],
        stream: false,
      }))

      expect(calls).toBe(2)
      expect(executed).toBe(1)
      expect(events.filter(e => e.type === 'tool_use').map(e => e.id)).toEqual(['tc_valid'])
      expect(events.find(e => e.type === 'tool_error')).toBeUndefined()
      expect(events.find(e => e.type === 'done')?.answer).toBe('done')
    })

    it('fails internally after repeated invalid tool contract repairs without executing tools', async () => {
      let calls = 0
      let executed = 0
      registerProvider('test-tool-contract-repair-limit', ({ messages }) => {
        calls++
        if (calls > 1) {
          expect(messages.at(-1)).toMatchObject({ role: 'system', metadata: { internal: true, kind: 'tool_contract_repair' } })
          expect(messages.at(-1).content).toContain('Tool call arguments failed schema validation')
        }
        return {
          content: '',
          tool_calls: [{ id: `tc_invalid_${calls}`, name: 'bash', input: {} }],
          stop_reason: 'tool_use',
        }
      })

      const events = await collect(agenticAsk('keep failing tools', {
        apiKey: 'sk-test',
        provider: 'test-tool-contract-repair-limit',
        tools: [{
          name: 'bash',
          description: 'Run shell',
          parameters: {
            type: 'object',
            properties: { command: { type: 'string' }, label: { type: 'string' } },
            required: ['command', 'label'],
          },
          execute: async () => { executed++; return { output: 'should-not-run' } },
        }],
        stream: false,
      }))

      expect(calls).toBe(3)
      expect(executed).toBe(0)
      expect(events.find(e => e.type === 'tool_use')).toBeUndefined()
      expect(events.find(e => e.type === 'tool_result')).toBeUndefined()
      const failed = events.find(e => e.type === 'failed')
      expect(failed).toBeTruthy()
      expect(String(failed.error || failed.message)).toContain('Invalid tool calls after contract repair attempts')
    })

    it('stringifies object prompts and object history before provider calls', async () => {
      const calls = []
      registerProvider('test-object-prompt', ({ messages, system }) => {
        calls.push({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          system,
        })
        return { content: 'done', tool_calls: [], stop_reason: 'stop' }
      })

      const events = await collect(agenticAsk({ kind: 'event', body: 'hello' }, {
        apiKey: 'sk-test',
        provider: 'test-object-prompt',
        tools: [],
        stream: false,
        history: [
          { role: 'user', content: { kind: 'history', body: 'prev user' } },
          { role: 'assistant', content: { kind: 'history', body: 'prev assistant' } },
          { role: 'tool', tool_call_id: 'tool-1', content: { kind: 'tool', value: 1 } },
        ],
        system: { kind: 'system', scope: 'runtime' },
      }))

      expect(calls).toHaveLength(1)
      expect(calls[0].messages).toEqual([
        { role: 'user', content: '{"kind":"history","body":"prev user"}' },
        { role: 'assistant', content: '{"kind":"history","body":"prev assistant"}' },
        { role: 'tool', content: '{"kind":"tool","value":1}' },
        { role: 'user', content: '{"kind":"event","body":"hello"}' },
      ])
      expect(calls[0].system).toBe('{"kind":"system","scope":"runtime"}')
      expect(events.find(e => /charCodeAt/.test(String(e.error || e.message || '')))).toBeUndefined()
    })
  })

  describe('max_tokens continuation', () => {
    it('continues truncated responses and concatenates the final answer', async () => {
      const calls = []
      registerProvider('test-continuation', ({ messages }) => {
        calls.push(messages.map(m => ({ role: m.role, content: m.content })))
        if (calls.length === 1) return { content: 'part one ', tool_calls: [], stop_reason: 'max_tokens' }
        return { content: 'part two', tool_calls: [], stop_reason: 'stop' }
      })

      const events = await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'test-continuation',
        tools: [],
        stream: false,
      }))

      expect(calls).toHaveLength(2)
      expect(calls[1].at(-2)).toEqual({ role: 'assistant', content: 'part one ' })
      expect(calls[1].at(-1)).toEqual({ role: 'user', content: 'Continue from where you left off.' })
      expect(events.filter(e => e.type === 'text_delta').map(e => e.text)).toEqual(['part one ', 'part two'])
      expect(events.find(e => e.type === 'done')?.answer).toBe('part one part two')
    })

    it('continues truncated streaming responses while yielding each text_delta', async () => {
      let calls = 0
      registerProvider('test-continuation', () => {
        calls++
        if (calls === 1) return { content: 'stream one ', tool_calls: [], stop_reason: 'max_tokens' }
        return { content: 'stream two', tool_calls: [], stop_reason: 'stop' }
      })

      const events = await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'test-continuation',
        tools: [],
        stream: true,
      }))

      expect(calls).toBe(2)
      expect(events.filter(e => e.type === 'text_delta').map(e => e.text)).toEqual(['stream one ', 'stream two'])
      expect(events.find(e => e.type === 'done')?.answer).toBe('stream one stream two')
    })

    it('stops after the continuation limit and returns accumulated content', async () => {
      let calls = 0
      registerProvider('test-continuation', () => {
        calls++
        return { content: `chunk ${calls} `, tool_calls: [], stop_reason: 'max_tokens' }
      })

      const events = await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'test-continuation',
        tools: [],
        stream: false,
      }))

      expect(calls).toBe(6)
      expect(events.filter(e => e.type === 'text_delta').map(e => e.text)).toEqual([
        'chunk 1 ',
        'chunk 2 ',
        'chunk 3 ',
        'chunk 4 ',
        'chunk 5 ',
        'chunk 6 ',
      ])
      expect(events.find(e => e.type === 'done')?.answer).toBe('chunk 1 chunk 2 chunk 3 chunk 4 chunk 5 chunk 6 ')
    })
  })

  describe('transformToolContent', () => {
    async function runToolTransformCase({ output, marker }) {
      const providerMessages = []
      let calls = 0
      const transformCalls = []

      registerProvider('test-transform-tool-content', ({ messages }) => {
        calls++
        providerMessages.push(JSON.parse(JSON.stringify(messages)))
        if (calls === 1) {
          return {
            content: 'calling tool',
            tool_calls: [{ id: 'tc_transform', name: 'capture_output', input: {} }],
            stop_reason: 'tool_use',
          }
        }
        return { content: 'done', tool_calls: [], stop_reason: 'stop' }
      })

      const events = await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'test-transform-tool-content',
        tools: [{
          name: 'capture_output',
          description: 'Capture test output',
          input_schema: { type: 'object', properties: {} },
          execute: async () => output,
        }],
        stream: false,
        transformToolContent: async args => {
          transformCalls.push(args)
          return marker && args.content.length > 8000 ? marker : args.content
        },
      }))

      return { events, providerMessages, transformCalls }
    }

    it('passes small tool result content through unchanged', async () => {
      const { providerMessages, transformCalls } = await runToolTransformCase({ output: 'short output' })
      const toolMessage = providerMessages[1].find(msg => msg.role === 'tool')

      expect(transformCalls).toEqual([{
        id: 'tc_transform',
        name: 'capture_output',
        content: JSON.stringify('short output'),
      }])
      expect(toolMessage.content).toBe(JSON.stringify('short output'))
      expect(toolMessage.blocks).toEqual([{ type: 'text', text: 'short output' }])
    })

    it('uses transformed content for large text-only tool messages without changing emitted output', async () => {
      const output = 'x'.repeat(20000)
      const marker = '<persisted-output id="po_test">Use read_persisted_output(id="po_test") to read the full output.</persisted-output>'
      const { events, providerMessages, transformCalls } = await runToolTransformCase({ output, marker })
      const toolMessage = providerMessages[1].find(msg => msg.role === 'tool')

      expect(transformCalls[0]).toMatchObject({
        id: 'tc_transform',
        name: 'capture_output',
        content: JSON.stringify(output),
      })
      expect(toolMessage.content).toBe(marker)
      expect(toolMessage.blocks).toEqual([{ type: 'text', text: marker }])
      expect(JSON.stringify(toolMessage).length).toBeLessThan(12000)
      expect(events.find(event => event.type === 'tool_result')?.output).toBe(output)
    })
  })


  describe('model request lifecycle', () => {
    const largeOutput = 'x'.repeat(1024 * 1024)

    it('emits a first-event timeout for a post-tool continuation with no provider event', async () => {
      let calls = 0
      registerProvider('test-model-lifecycle', () => {
        calls++
        if (calls === 1) {
          return {
            content: 'calling tool',
            tool_calls: [{ id: 'tc_lifecycle', name: 'large_output', input: {} }],
            stop_reason: 'tool_use',
          }
        }
        return (async function* () {
          await new Promise(() => {})
        })()
      })

      const events = await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'test-model-lifecycle',
        tools: [{
          name: 'large_output',
          description: 'Return a large tool result',
          input_schema: { type: 'object', properties: {} },
          execute: async () => largeOutput,
        }],
        stream: true,
        retries: 0,
        modelRequestFirstEventTimeoutMs: 10,
        modelStreamIdleTimeoutMs: 0,
        transformToolContent: async args => args.content.length > 8000 ? '<persisted-output id="po_test" />' : args.content,
      }))

      expect(calls).toBe(2)
      expect(events.find(e => e.type === 'tool_result')?.output).toBe(largeOutput)
      expect(events.filter(e => e.type === 'modelRequestStart').map(e => e.stage)).toEqual([
        'model_request',
        'model_request_after_tool',
      ])
      expect(events.find(e => e.type === 'modelRequestTimeout')).toMatchObject({
        stage: 'model_request_after_tool',
        errorType: 'model_request_first_event_timeout',
      })
      expect(events.find(e => e.type === 'error')).toMatchObject({
        category: 'model_request_first_event_timeout',
        causeCode: 'model_request_first_event_timeout',
        requestStage: 'model_request_after_tool',
      })
      expect(events.find(e => e.type === 'done')).toBeUndefined()
    })

    it('emits a stream-idle timeout after a post-tool continuation starts streaming', async () => {
      let calls = 0
      registerProvider('test-model-lifecycle-idle', () => {
        calls++
        if (calls === 1) {
          return {
            content: 'calling tool',
            tool_calls: [{ id: 'tc_idle', name: 'large_output', input: {} }],
            stop_reason: 'tool_use',
          }
        }
        return (async function* () {
          yield { type: 'text_delta', text: 'partial' }
          await new Promise(() => {})
        })()
      })

      const events = await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'test-model-lifecycle-idle',
        tools: [{
          name: 'large_output',
          description: 'Return a large tool result',
          input_schema: { type: 'object', properties: {} },
          execute: async () => largeOutput,
        }],
        stream: true,
        retries: 0,
        modelRequestFirstEventTimeoutMs: 20,
        modelStreamIdleTimeoutMs: 10,
        transformToolContent: async args => args.content.length > 8000 ? '<persisted-output id="po_test" />' : args.content,
      }))

      expect(events.find(e => e.type === 'modelRequestFirstEvent' && e.stage === 'model_request_after_tool')).toMatchObject({
        firstEventType: 'text_delta',
      })
      expect(events.filter(e => e.type === 'text_delta').map(e => e.text)).toContain('partial')
      expect(events.find(e => e.type === 'modelRequestTimeout')).toMatchObject({
        stage: 'model_request_after_tool',
        errorType: 'model_stream_idle_timeout',
        firstEventType: 'text_delta',
      })
      expect(events.find(e => e.type === 'error')).toMatchObject({
        category: 'model_stream_idle_timeout',
        causeCode: 'model_stream_idle_timeout',
        firstEventType: 'text_delta',
      })
    })

    it('emits start, first-event, and end for a normal post-tool continuation', async () => {
      let calls = 0
      registerProvider('test-model-lifecycle-ok', () => {
        calls++
        if (calls === 1) {
          return {
            content: 'calling tool',
            tool_calls: [{ id: 'tc_ok', name: 'large_output', input: {} }],
            stop_reason: 'tool_use',
          }
        }
        return (async function* () {
          yield { type: 'text_delta', text: 'done' }
        })()
      })

      const events = await collect(agenticAsk('hi', {
        apiKey: 'sk-test',
        provider: 'test-model-lifecycle-ok',
        tools: [{
          name: 'large_output',
          description: 'Return a large tool result',
          input_schema: { type: 'object', properties: {} },
          execute: async () => largeOutput,
        }],
        stream: true,
        retries: 0,
        modelRequestFirstEventTimeoutMs: 20,
        modelStreamIdleTimeoutMs: 20,
        transformToolContent: async args => args.content.length > 8000 ? '<persisted-output id="po_test" />' : args.content,
      }))

      expect(events.find(e => e.type === 'modelRequestStart' && e.stage === 'model_request_after_tool')).toBeTruthy()
      expect(events.find(e => e.type === 'modelRequestFirstEvent' && e.stage === 'model_request_after_tool')).toMatchObject({ firstEventType: 'text_delta' })
      expect(events.find(e => e.type === 'modelRequestEnd' && e.stage === 'model_request_after_tool')).toMatchObject({ firstEventType: 'text_delta' })
      expect(events.find(e => e.type === 'modelRequestTimeout')).toBeUndefined()
      expect(events.find(e => e.type === 'done')?.answer).toBe('done')
    })
  })

  describe('buildToolResults', () => {
    it('should build tool result messages', () => {
      const toolCalls = [
        { id: 'tc_1', name: 'search', input: { q: 'test' } },
        { id: 'tc_2', name: 'calc', input: { expr: '1+1' } },
      ]
      const results = [
        { output: 'found it' },
        { output: 2 },
      ]
      const msgs = buildToolResults(toolCalls, results)
      expect(msgs).toHaveLength(2)
      expect(msgs[0].role).toBe('tool')
      expect(msgs[0].tool_call_id).toBe('tc_1')
      expect(JSON.parse(msgs[0].content)).toBe('found it')
      expect(JSON.parse(msgs[1].content)).toBe(2)
    })

    it('should handle error results', () => {
      const toolCalls = [{ id: 'tc_1', name: 'fail', input: {} }]
      const results = [{ error: 'something broke' }]
      const msgs = buildToolResults(toolCalls, results)
      expect(JSON.parse(msgs[0].content)).toEqual({ error: 'something broke' })
    })
  })

  describe('toolRegistry', () => {
    it('should be an object with register/get/list', () => {
      expect(typeof toolRegistry).toBe('object')
      expect(typeof toolRegistry.register).toBe('function')
      expect(typeof toolRegistry.get).toBe('function')
      expect(typeof toolRegistry.list).toBe('function')
    })

    it('should register and retrieve tools', () => {
      toolRegistry.register('test_tool', { description: 'A test', execute: () => 'ok' })
      expect(toolRegistry.get('test_tool')).toBeDefined()
      expect(toolRegistry.get('test_tool').name).toBe('test_tool')
      toolRegistry.unregister('test_tool')
    })

    it('should list registered tools', () => {
      toolRegistry.register('a', { description: 'A', execute: () => {} })
      toolRegistry.register('b', { description: 'B', execute: () => {} })
      const list = toolRegistry.list()
      expect(list.length).toBeGreaterThanOrEqual(2)
      toolRegistry.unregister('a')
      toolRegistry.unregister('b')
    })

    it('should throw on invalid registration', () => {
      expect(() => toolRegistry.register('', {})).toThrow()
      expect(() => toolRegistry.register('x', null)).toThrow()
      expect(() => toolRegistry.register('x', { description: 'no exec' })).toThrow()
    })
  })
})
