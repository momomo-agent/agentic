import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.document = dom.window.document
global.window = dom.window
global.requestAnimationFrame = vi.fn((fn) => { fn(); return 1 })
global.cancelAnimationFrame = vi.fn()

// Import after DOM setup
const AgenticRender = await import('../agentic-render.js').then(m => m.default || m)

describe('AgenticRender', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'test-container'
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.clearAllMocks()
  })

  describe('exports', () => {
    it('should export required functions', () => {
      expect(AgenticRender).toBeDefined()
      expect(typeof AgenticRender.create).toBe('function')
      expect(typeof AgenticRender.render).toBe('function')
      expect(typeof AgenticRender.getCSS).toBe('function')
    })

    it('should export theme constants', () => {
      expect(AgenticRender.THEME_DARK).toBeDefined()
      expect(AgenticRender.THEME_LIGHT).toBeDefined()
    })
  })

  describe('create', () => {
    it('should create renderer instance', () => {
      const renderer = AgenticRender.create(container)
      expect(renderer).toBeDefined()
      expect(typeof renderer.append).toBe('function')
      expect(typeof renderer.set).toBe('function')
      expect(typeof renderer.getContent).toBe('function')
      expect(typeof renderer.destroy).toBe('function')
    })

    it('should accept selector string', () => {
      const renderer = AgenticRender.create('#test-container')
      expect(renderer).toBeDefined()
    })

    it('should throw on invalid target', () => {
      expect(() => AgenticRender.create('#non-existent')).toThrow()
    })

    it('should accept theme option', () => {
      const renderer = AgenticRender.create(container, { theme: 'light' })
      expect(renderer).toBeDefined()
    })

    it('should accept custom className', () => {
      const renderer = AgenticRender.create(container, { className: 'custom-class' })
      expect(renderer).toBeDefined()
      const root = container.querySelector('.ar-root')
      expect(root.className).toContain('custom-class')
    })
  })

  describe('render - static', () => {
    it('should render plain text', () => {
      const html = AgenticRender.render('Hello world')
      expect(html).toContain('Hello world')
      expect(html).toContain('<p')
    })

    it('should render inline code', () => {
      const html = AgenticRender.render('Use `console.log` here')
      expect(html).toContain('<code class="ar-inline-code">')
      expect(html).toContain('console.log')
    })

    it('should render bold text', () => {
      const html = AgenticRender.render('This is **bold** text')
      expect(html).toContain('<strong')
      expect(html).toContain('bold')
    })

    it('should render italic text', () => {
      const html = AgenticRender.render('This is *italic* text')
      expect(html).toContain('<em')
      expect(html).toContain('italic')
    })

    it('should render code blocks', () => {
      const md = '```python\nprint("hello")\n```'
      const html = AgenticRender.render(md)
      expect(html).toContain('ar-code-wrap')
      expect(html).toContain('ar-pre')
      expect(html).toContain('print')
      expect(html).toContain('python')
    })

    it('should render unordered lists with dash', () => {
      const md = '- item one\n- item two'
      const html = AgenticRender.render(md)
      expect(html).toContain('<ul')
      expect(html).toContain('<li')
      expect(html).toContain('item one')
      expect(html).toContain('item two')
    })

    it('should render unordered lists with asterisk', () => {
      const md = '* alpha\n* beta'
      const html = AgenticRender.render(md)
      expect(html).toContain('<ul')
      expect(html).toContain('alpha')
      expect(html).toContain('beta')
    })

    it('should render headings', () => {
      const h1 = AgenticRender.render('# Heading One')
      expect(h1).toContain('<h1')
      expect(h1).toContain('Heading One')

      const h2 = AgenticRender.render('## Heading Two')
      expect(h2).toContain('<h2')
      expect(h2).toContain('Heading Two')

      const h3 = AgenticRender.render('### Heading Three')
      expect(h3).toContain('<h3')
      expect(h3).toContain('Heading Three')
    })

    it('should render links', () => {
      const html = AgenticRender.render('[OpenAI](https://openai.com)')
      expect(html).toContain('<a')
      expect(html).toContain('href="https://openai.com"')
      expect(html).toContain('OpenAI')
    })

    it('should escape HTML entities', () => {
      const html = AgenticRender.render('<script>alert("xss")</script>')
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })
  })

  describe('renderer instance', () => {
    let renderer

    beforeEach(() => {
      renderer = AgenticRender.create(container)
    })

    afterEach(() => {
      renderer?.destroy()
    })

    it('should append content', () => {
      renderer.append('Hello')
      renderer.append(' world')
      const content = renderer.getContent()
      expect(content).toBe('Hello world')
    })

    it('should set content (replace)', () => {
      renderer.append('Old content')
      renderer.set('New content')
      const content = renderer.getContent()
      expect(content).toBe('New content')
    })

    it('should get current content', () => {
      renderer.append('Test content')
      expect(renderer.getContent()).toBe('Test content')
    })

    it('should handle streaming code blocks', () => {
      renderer.append('```js\n')
      renderer.append('console.log')
      renderer.append('("hi")\n')
      renderer.append('```')
      const content = renderer.getContent()
      expect(content).toContain('```js')
      expect(content).toContain('console.log')
    })

    it('should schedule render with requestAnimationFrame', () => {
      renderer.append('Test')
      expect(global.requestAnimationFrame).toHaveBeenCalled()
    })

    it('should cleanup on destroy', () => {
      const root = container.querySelector('.ar-root')
      expect(root).toBeDefined()
      renderer.destroy()
      const afterDestroy = container.querySelector('.ar-root')
      expect(afterDestroy).toBeNull()
    })
  })

  describe('syntax highlighting', () => {
    it('should highlight keywords', () => {
      const html = AgenticRender.render('```js\nconst x = 42\n```')
      expect(html).toContain('ar-kw')
    })

    it('should highlight strings', () => {
      const html = AgenticRender.render('```js\nconst s = "hello"\n```')
      expect(html).toContain('ar-str')
    })

    it('should highlight numbers', () => {
      const html = AgenticRender.render('```js\nconst n = 123\n```')
      expect(html).toContain('ar-num')
    })

    it('should highlight comments', () => {
      const html = AgenticRender.render('```js\n// comment\n```')
      expect(html).toContain('ar-cmt')
    })

    it('should handle Python syntax', () => {
      const html = AgenticRender.render('```python\ndef hello():\n    pass\n```')
      expect(html).toContain('ar-kw')
    })
  })

  describe('getCSS', () => {
    it('should return CSS string', () => {
      const css = AgenticRender.getCSS()
      expect(typeof css).toBe('string')
      expect(css.length).toBeGreaterThan(0)
      expect(css).toContain('.ar-root')
    })

    it('should include theme variables', () => {
      const css = AgenticRender.getCSS()
      expect(css).toContain('--ar-')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const html = AgenticRender.render('')
      expect(html).toBeDefined()
    })

    it('should throw on null/undefined', () => {
      expect(() => AgenticRender.render(null)).toThrow()
      expect(() => AgenticRender.render(undefined)).toThrow()
    })

    it('should handle mixed markdown', () => {
      const md = '# Title\n\nSome **bold** and *italic* text.\n\n- List item\n- Another item\n\n```js\ncode()\n```'
      const html = AgenticRender.render(md)
      expect(html).toContain('<h1')
      expect(html).toContain('<strong')
      expect(html).toContain('<em')
      expect(html).toContain('<ul')
      expect(html).toContain('ar-code-wrap')
    })

    it('should handle incomplete code blocks gracefully', () => {
      const renderer = AgenticRender.create(container)
      renderer.append('```js\nconst x = ')
      const content = renderer.getContent()
      expect(content).toContain('```js')
      renderer.destroy()
    })
  })
})
