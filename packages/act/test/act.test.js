import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgenticAct } from '../src/index.js'

describe('AgenticAct', () => {
  let act

  beforeEach(() => {
    act = new AgenticAct({
      provider: 'openai',
      apiKey: 'test-key',
      actions: [
        { id: 'greet', description: 'Greet the user', handler: vi.fn().mockResolvedValue('greeted') },
        { id: 'search', description: 'Search for information', handler: vi.fn().mockResolvedValue('searched') }
      ]
    })
    // Mock _callLLM to avoid needing agentic-core
    act._callLLM = vi.fn().mockResolvedValue(JSON.stringify({ action: 'greet', confidence: 0.9, reason: 'User said hello' }))
  })

  describe('constructor', () => {
    it('should create with default config', () => {
      const a = new AgenticAct({ apiKey: 'key', actions: [] })
      expect(a.provider).toBe('openai')
      expect(a.actions).toEqual([])
    })

    it('should use anthropic model when provider is anthropic', () => {
      const a = new AgenticAct({ provider: 'anthropic', apiKey: 'key', actions: [] })
      expect(a.model).toContain('claude')
    })
  })

  describe('register', () => {
    it('should register new action', () => {
      const a = new AgenticAct({ apiKey: 'key', actions: [] })
      a.register({ id: 'test', description: 'Test action' })
      expect(a.actions).toHaveLength(1)
    })

    it('should chain register calls', () => {
      const a = new AgenticAct({ apiKey: 'key', actions: [] })
      a.register({ id: 'a', description: 'A' })
       .register({ id: 'b', description: 'B' })
      expect(a.actions).toHaveLength(2)
    })
  })

  describe('decide', () => {
    it('should return decision with action', async () => {
      const decision = await act.decide({ text: 'Hello!' })
      expect(decision).toHaveProperty('action')
      expect(decision).toHaveProperty('confidence')
      expect(decision.action).toBe('greet')
    })

    it('should call _callLLM with text input', async () => {
      await act.decide({ text: 'Search for cats' })
      expect(act._callLLM).toHaveBeenCalled()
    })

    it('should return fallback when no input text', async () => {
      const decision = await act.decide({})
      // _buildUserContent handles empty input, returns a decision anyway
      expect(decision).toHaveProperty('action')
    })
  })

  describe('run', () => {
    it('should decide and execute handler', async () => {
      const result = await act.run({ text: 'Hello!' })
      expect(result).toHaveProperty('action')
      expect(result).toHaveProperty('output')
      expect(result.executed).toBe(true)
    })

    it('should call registered handler', async () => {
      await act.run({ text: 'Hello!' })
      const greetAction = act.actions.find(a => a.id === 'greet')
      expect(greetAction.handler).toHaveBeenCalled()
    })
  })
})
