import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgenticClient, AgenticError } from '../src/index.js'

describe('AgenticClient', () => {
  let client

  beforeEach(() => {
    client = new AgenticClient('http://localhost:1234')
    global.fetch = vi.fn()
  })

  describe('constructor', () => {
    it('should create with default baseUrl', () => {
      const c = new AgenticClient()
      expect(c.baseUrl).toBe('http://localhost:1234')
    })

    it('should accept string baseUrl', () => {
      const c = new AgenticClient('http://example.com')
      expect(c.baseUrl).toBe('http://example.com')
    })

    it('should accept options object', () => {
      const c = new AgenticClient({ baseUrl: 'http://example.com' })
      expect(c.baseUrl).toBe('http://example.com')
    })

    it('should strip trailing slash', () => {
      const c = new AgenticClient('http://example.com/')
      expect(c.baseUrl).toBe('http://example.com')
    })

    it('should have admin property', () => {
      expect(client.admin).toBeDefined()
    })
  })

  describe('think', () => {
    it('should call /v1/chat/completions', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello!' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 }
        })
      })
      const result = await client.think('hi')
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.objectContaining({ method: 'POST' })
      )
      expect(result.answer).toBe('Hello!')
    })

    it('should pass model option', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] })
      })
      await client.think('hi', { model: 'gpt-4' })
      const body = JSON.parse(global.fetch.mock.calls[0][1].body)
      expect(body.model).toBe('gpt-4')
    })
  })

  describe('see', () => {
    it('should include image in messages', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'A cat' } }] })
      })
      await client.see('data:image/png;base64,abc', 'What is this?')
      const body = JSON.parse(global.fetch.mock.calls[0][1].body)
      const userMsg = body.messages.find(m => m.role === 'user')
      expect(userMsg.content).toBeInstanceOf(Array)
      expect(userMsg.content.some(c => c.type === 'image_url')).toBe(true)
    })
  })

  describe('capabilities', () => {
    it('should call /v1/capabilities', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ think: true, speak: false })
      })
      const caps = await client.capabilities()
      expect(caps).toHaveProperty('think')
    })
  })

  describe('AgenticError', () => {
    it('should have status and message', () => {
      const err = new AgenticError('Not found', 404)
      expect(err.message).toBe('Not found')
      expect(err.status).toBe(404)
      expect(err).toBeInstanceOf(Error)
    })
  })
})
