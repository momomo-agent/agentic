import { describe, it, expect } from 'vitest'
import { classifyError, buildToolResults, toolRegistry } from '../src/index.js'

describe('agentic-core', () => {
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
    })

    it('should classify unknown errors', () => {
      expect(classifyError({ message: 'something weird' })).toEqual({ category: 'unknown', retryable: false })
      expect(classifyError(null)).toEqual({ category: 'unknown', retryable: false })
    })

    it('should handle string errors', () => {
      expect(classifyError('rate limit').category).toBe('rate_limit')
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
