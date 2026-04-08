import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock agenticAsk globally before importing
let mockAskCalls = []
let mockAskResult = { answer: 'mock answer', rounds: 1 }

globalThis.agenticAsk = vi.fn(async (input, config, emit) => {
  mockAskCalls.push({ input, config, emit })
  if (emit) {
    emit('token', { text: mockAskResult.answer })
  }
  return mockAskResult
})

// Import after mocking
const { createClaw } = await import('../agentic-claw.js')

describe('AgenticClaw', () => {
  beforeEach(() => {
    mockAskCalls = []
    mockAskResult = { answer: 'mock answer', rounds: 1 }
    globalThis.agenticAsk.mockClear()
  })

  describe('createClaw', () => {
    it('should create claw instance with required options', () => {
      const claw = createClaw({ apiKey: 'test-key' })
      expect(claw).toBeDefined()
      expect(typeof claw.chat).toBe('function')
      expect(typeof claw.session).toBe('function')
      expect(typeof claw.on).toBe('function')
      expect(typeof claw.destroy).toBe('function')
      claw.destroy()
    })

    it('should throw on missing apiKey', () => {
      expect(() => createClaw({})).toThrow(/apiKey is required/)
      expect(() => createClaw()).toThrow(/apiKey is required/)
    })

    it('should accept all configuration options', () => {
      const claw = createClaw({
        apiKey: 'test-key',
        provider: 'openai',
        baseUrl: 'https://custom.api',
        model: 'gpt-4',
        proxyUrl: 'https://proxy.example',
        systemPrompt: 'You are helpful.',
        maxTokens: 4000,
        stream: false,
      })
      expect(claw).toBeDefined()
      claw.destroy()
    })
  })

  describe('session management', () => {
    let claw

    beforeEach(() => {
      mockAskCalls = []
      claw = createClaw({ apiKey: 'test-key' })
    })

    afterEach(() => {
      claw.destroy()
    })

    it('should create named session', () => {
      const s = claw.session('alice')
      expect(s.id).toBe('alice')
      expect(typeof s.chat).toBe('function')
      expect(s.memory).toBeDefined()
    })

    it('should reuse existing session by id', () => {
      const s1 = claw.session('bob')
      const s2 = claw.session('bob')
      expect(s1.memory).toBe(s2.memory)
    })

    it('should list active session ids', () => {
      claw.session('alice')
      claw.session('bob')
      const ids = claw.sessions()
      expect(ids).toContain('default')
      expect(ids).toContain('alice')
      expect(ids).toContain('bob')
    })
  })

  describe('chat', () => {
    let claw

    beforeEach(() => {
      mockAskCalls = []
      mockAskResult = { answer: 'hello back', rounds: 1 }
      claw = createClaw({ apiKey: 'test-key' })
    })

    afterEach(() => {
      claw.destroy()
    })

    it('should send message and return result', async () => {
      const result = await claw.chat('hello')
      expect(result.answer).toBe('hello back')
      expect(result.rounds).toBe(1)
      expect(result.messages).toBeDefined()
      expect(mockAskCalls).toHaveLength(1)
      expect(mockAskCalls[0].input).toBe('hello')
    })

    it('should pass config to agenticAsk', async () => {
      const c = createClaw({
        apiKey: 'my-key',
        provider: 'openai',
        model: 'gpt-4',
        baseUrl: 'https://custom.api',
      })
      await c.chat('test')
      const config = mockAskCalls[0].config
      expect(config.apiKey).toBe('my-key')
      expect(config.provider).toBe('openai')
      expect(config.model).toBe('gpt-4')
      expect(config.baseUrl).toBe('https://custom.api')
      c.destroy()
    })

    it('should handle emit callback', async () => {
      const tokens = []
      await claw.chat('hello', (event, data) => {
        if (event === 'token') tokens.push(data.text)
      })
      expect(tokens.length).toBeGreaterThan(0)
    })

    it('should accept per-call options', async () => {
      await claw.chat('hello', { tools: ['search'] }, () => {})
      const config = mockAskCalls[0].config
      expect(config.tools).toEqual(['search'])
    })

    it('should store conversation history', async () => {
      await claw.chat('hello')
      await claw.chat('follow up')
      expect(mockAskCalls).toHaveLength(2)
      const history = mockAskCalls[1].config.history
      expect(history.length).toBeGreaterThanOrEqual(2)
    })

    it('should isolate session chat', async () => {
      const alice = claw.session('alice')
      const bob = claw.session('bob')
      await alice.chat('I am Alice')
      await bob.chat('I am Bob')
      
      const aliceHistory = alice.memory.history()
      const bobHistory = bob.memory.history()
      expect(aliceHistory.some(m => m.content === 'I am Alice')).toBe(true)
      expect(aliceHistory.some(m => m.content === 'I am Bob')).toBe(false)
      expect(bobHistory.some(m => m.content === 'I am Bob')).toBe(true)
      expect(bobHistory.some(m => m.content === 'I am Alice')).toBe(false)
    })
  })

  describe('knowledge', () => {
    it('should throw when knowledge not enabled', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      await expect(claw.learn('doc', 'content')).rejects.toThrow(/Knowledge not enabled/)
      await expect(claw.recall('query')).rejects.toThrow(/Knowledge not enabled/)
      await expect(claw.forget('doc')).rejects.toThrow(/Knowledge not enabled/)
      claw.destroy()
    })

    it('should work when knowledge enabled', async () => {
      const claw = createClaw({ apiKey: 'test-key', knowledge: true })
      await claw.learn('physics', 'Quantum computing uses qubits for calculations')
      await claw.learn('ml', 'Neural networks are inspired by the brain')

      const results = await claw.recall('quantum')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.id === 'physics')).toBe(true)

      await claw.forget('physics')
      const after = await claw.recall('quantum qubits')
      expect(after.some(r => r.id === 'physics')).toBe(false)

      claw.destroy()
    })

    it('should return null knowledgeInfo when disabled', () => {
      const claw = createClaw({ apiKey: 'test-key' })
      expect(claw.knowledgeInfo()).toBeNull()
      claw.destroy()
    })
  })

  describe('lifecycle', () => {
    it('should register and fire heartbeat', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      let fired = 0
      claw.heartbeat(() => { fired++ }, 50)
      await new Promise(r => setTimeout(r, 130))
      expect(fired).toBeGreaterThanOrEqual(2)
      claw.destroy()
    })

    it('should parse time patterns in schedule', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      let count = 0
      claw.schedule(50, () => { count++ })
      await new Promise(r => setTimeout(r, 130))
      expect(count).toBeGreaterThanOrEqual(2)
      claw.destroy()
    })

    it('should parse string patterns in schedule', () => {
      const claw = createClaw({ apiKey: 'test-key' })
      expect(() => claw.schedule('1s', () => {})).not.toThrow()
      expect(() => claw.schedule('5m', () => {})).not.toThrow()
      expect(() => claw.schedule('1h', () => {})).not.toThrow()
      expect(() => claw.schedule('1d', () => {})).not.toThrow()
      claw.destroy()
    })

    it('should throw on invalid schedule pattern', () => {
      const claw = createClaw({ apiKey: 'test-key' })
      expect(() => claw.schedule('invalid', () => {})).toThrow(/Invalid schedule pattern/)
      expect(() => claw.schedule('5x', () => {})).toThrow(/Invalid schedule pattern/)
      claw.destroy()
    })

    it('should clear all intervals on destroy', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      let heartCount = 0
      let schedCount = 0
      claw.heartbeat(() => { heartCount++ }, 30)
      claw.schedule(30, () => { schedCount++ })
      claw.destroy()
      const h = heartCount
      const s = schedCount
      await new Promise(r => setTimeout(r, 100))
      expect(heartCount).toBe(h)
      expect(schedCount).toBe(s)
    })
  })

  describe('events', () => {
    it('should register and remove listeners', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      const messages = []
      const handler = (msg) => messages.push(msg)
      claw.on('message', handler)
      await claw.chat('hello')
      expect(messages.length).toBeGreaterThanOrEqual(1)

      const countBefore = messages.length
      claw.off('message', handler)
      await claw.chat('hello again')
      expect(messages.length).toBe(countBefore)
      claw.destroy()
    })

    it('should emit token events during chat', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      const tokens = []
      claw.on('token', (data) => tokens.push(data))
      await claw.chat('hello')
      expect(tokens.length).toBeGreaterThan(0)
      claw.destroy()
    })
  })

  describe('memory access', () => {
    it('should return default session memory', () => {
      const claw = createClaw({ apiKey: 'test-key' })
      expect(claw.memory).toBeDefined()
      expect(typeof claw.memory.messages).toBe('function')
      expect(typeof claw.memory.info).toBe('function')
      claw.destroy()
    })

    it('should reset conversation on clear', async () => {
      const claw = createClaw({ apiKey: 'test-key' })
      await claw.chat('hello')
      const before = claw.memory.info().messageCount
      expect(before).toBeGreaterThan(0)
      claw.memory.clear()
      const after = claw.memory.info().messageCount
      expect(after).toBe(0)
      claw.destroy()
    })
  })
})
