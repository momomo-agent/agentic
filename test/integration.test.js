import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Agentic } from '../packages/agentic/agentic.js'
import { unlinkSync, existsSync } from 'fs'

const OLLAMA = {
  provider: 'ollama',
  model: 'qwen3:0.6b',
  baseUrl: 'http://localhost:11434',
  apiKey: 'ollama',
}

const DB_PATH = '/tmp/agentic-integration-test.db'

function cleanup() {
  for (const f of [DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm']) {
    if (existsSync(f)) unlinkSync(f)
  }
}

describe('Agentic integration', () => {
  let ai

  afterEach(() => {
    ai?.destroy()
    cleanup()
  })

  describe('think (LLM)', () => {
    it('generates a response via Ollama', async () => {
      ai = new Agentic(OLLAMA)
      const r = await ai.think('Reply with exactly: PONG')
      expect(r).toBeDefined()
      expect(typeof r).toBe('string')
      expect(r.length).toBeGreaterThan(0)
    }, 30_000)
  })

  describe('store (SQLite)', () => {
    beforeEach(cleanup)

    it('save/load/has/keys/deleteKey round-trip', async () => {
      ai = new Agentic({ store: { path: DB_PATH } })
      await ai.save('user', { name: 'kenefe', lang: 'zh' })
      await ai.save('count', 42)

      expect(await ai.load('user')).toEqual({ name: 'kenefe', lang: 'zh' })
      expect(await ai.load('count')).toBe(42)
      expect(await ai.has('user')).toBe(true)
      expect(await ai.has('nope')).toBe(false)

      const keys = await ai.keys()
      expect(keys).toContain('user')
      expect(keys).toContain('count')

      await ai.deleteKey('count')
      expect(await ai.has('count')).toBe(false)
      expect(await ai.load('count')).toBeUndefined()
    })

    it('raw SQL via query/exec/run', async () => {
      ai = new Agentic({ store: { path: DB_PATH } })
      await ai.exec('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT)')
      await ai.run('INSERT INTO items (name) VALUES (?)', ['alpha'])
      await ai.run('INSERT INTO items (name) VALUES (?)', ['beta'])
      const rows = await ai.query('SELECT name FROM items ORDER BY name')
      expect(rows.map(r => r.name)).toEqual(['alpha', 'beta'])
    })
  })

  describe('filesystem (memory backend)', () => {
    it('write/read/ls/tree/grep/delete', async () => {
      ai = new Agentic()
      await ai.writeFile('/hello.txt', 'hello world')
      await ai.writeFile('/docs/readme.md', '# Readme\nSome content here')

      expect(await ai.readFile('/hello.txt')).toBe('hello world')

      const root = await ai.ls('/')
      expect(root).toContain('hello.txt')
      expect(root).toContain('docs')

      const tree = await ai.tree('/')
      expect(tree).toBeDefined()

      const grep = await ai.grep('hello')
      expect(grep.length).toBeGreaterThan(0)

      await ai.deleteFile('/hello.txt')
      const after = await ai.ls('/')
      expect(after).not.toContain('hello.txt')
    })
  })

  describe('embed (local provider)', () => {
    it('index and semantic search', async () => {
      ai = new Agentic({ embed: { provider: 'local' } })
      await ai.index('paris', 'The capital of France is Paris')
      await ai.index('tokyo', 'The capital of Japan is Tokyo')
      await ai.index('python', 'Python is a programming language')

      const results = await ai.search('France capital')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe('paris')
    })
  })

  describe('act (tool registration)', () => {
    it('register and list actions', () => {
      ai = new Agentic(OLLAMA)
      ai.register({
        name: 'get_weather',
        description: 'Get weather for a city',
        parameters: { city: { type: 'string' } },
        handler: async (p) => ({ temp: 22, city: p.city }),
      })
      ai.register({
        name: 'play_music',
        description: 'Play a song',
        parameters: { song: { type: 'string' } },
        handler: async (p) => `playing ${p.song}`,
      })

      const actions = ai.listActions()
      expect(actions).toContain('get_weather')
      expect(actions).toContain('play_music')
    })

    it('execute a registered action via act()', async () => {
      ai = new Agentic(OLLAMA)
      ai.register({
        name: 'add',
        description: 'Add two numbers',
        parameters: { a: { type: 'number' }, b: { type: 'number' } },
        handler: async (p) => p.a + p.b,
      })
      const result = await ai.act('add', { a: 3, b: 4 })
      expect(result).toBe(7)
    })
  })

  describe('render (markdown → HTML)', () => {
    it('converts markdown to HTML', () => {
      ai = new Agentic()
      const html = ai.render('# Title\n\n**bold** and *italic*')
      expect(html).toContain('<h1')
      expect(html).toContain('Title')
      expect(html).toContain('<strong>')
      expect(html).toContain('<em>')
    })
  })

  describe('memory (remember + recall)', () => {
    it('stores and retrieves memories via embed', async () => {
      ai = new Agentic({ embed: { provider: 'local' } })
      await ai.remember('The meeting is at 3pm on Tuesday')
      await ai.remember('Buy milk and eggs from the store')
      await ai.remember('The project deadline is next Friday')

      const results = await ai.recall('When is the meeting?')
      expect(results.length).toBeGreaterThan(0)
      // recall returns embed search results with text field
      const texts = results.map(r => r.text || r.content || '')
      expect(texts.some(t => t.includes('meeting'))).toBe(true)
    })
  })

  describe('combined workflow', () => {
    beforeEach(cleanup)

    it('think + store + filesystem in one agent', async () => {
      ai = new Agentic({
        ...OLLAMA,
        store: { path: DB_PATH },
      })

      // Think
      const answer = await ai.think('What is 2+2? Reply with just the number.')
      expect(answer).toBeDefined()

      // Store the answer
      await ai.save('math_answer', answer)
      expect(await ai.load('math_answer')).toBe(answer)

      // Write to filesystem
      await ai.writeFile('/results/math.txt', `Answer: ${answer}`)
      expect(await ai.readFile('/results/math.txt')).toContain('Answer:')
    }, 30_000)
  })
})
