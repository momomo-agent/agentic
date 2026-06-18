import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
global.requestAnimationFrame = vi.fn((fn) => { fn(); return 1 })
global.cancelAnimationFrame = vi.fn()

// Import after DOM setup
const AgenticRender = await import('../src/index.js')

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
      expect(typeof AgenticRender.selectionMarkdown).toBe('function')
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

    it('should render mermaid fences as diagram placeholders with source', () => {
      const md = '```mermaid\ngraph TD\n  A --> B\n```'
      const html = AgenticRender.render(md, { sourceMap: true })
      expect(html).toContain('ar-mermaid-wrap')
      expect(html).toContain('data-ar-source-start="0" data-ar-source-end="3"')
      expect(html).toContain('data-ar-mermaid-state="pending"')
      expect(html).toContain('data-ar-mermaid-streaming="false"')
      expect(html).toContain('<pre class="ar-mermaid-source">graph TD\n  A --&gt; B</pre>')
      expect(html).not.toContain('ar-code-wrap')
    })

    it('should render streaming mermaid fences before the closing fence arrives', () => {
      const md = '```mermaid\ngraph TD\n  A --> B'
      const html = AgenticRender.render(md, { sourceMap: true })
      expect(html).toContain('ar-mermaid-wrap')
      expect(html).toContain('data-ar-source-start="0" data-ar-source-end="2"')
      expect(html).toContain('data-ar-mermaid-streaming="true"')
      expect(html).toContain('<pre class="ar-mermaid-source">graph TD\n  A --&gt; B</pre>')
      expect(html).not.toContain('ar-code-wrap')
      expect(html).not.toContain('ar-streaming-dot')
    })

    it('should render task checkboxes as Settings-style SVG icons', () => {
      const html = AgenticRender.render('- [ ] Todo\n- [x] Done')
      container.innerHTML = html
      const checkboxes = container.querySelectorAll('.ar-checkbox')
      const checked = container.querySelector('.ar-checkbox.ar-checked')
      const unchecked = [...checkboxes].find((node) => !node.classList.contains('ar-checked'))

      expect(checkboxes.length).toBe(2)
      expect(unchecked?.textContent).toBe('')
      expect(checked?.textContent).toBe('')
      expect(unchecked?.querySelector('svg.ar-checkbox-icon path')?.getAttribute('fill')).toBe('currentColor')
      expect(checked?.querySelector('svg.ar-checkbox-icon path')?.getAttribute('fill')).toBe('currentColor')
    })

    it('should render indented code fences from nested AI output', () => {
      const md = '    ```text\n    UV producer -> HDRPipeline.runSync(... uvMapImage:) -> GainMapPipeline parent:<uvMap\n    ```'
      const html = AgenticRender.render(md, { sourceMap: true })
      expect(html).toContain('ar-code-wrap')
      expect(html).toContain('text')
      expect(html).toContain('UV producer')
      expect(html).toContain('parent:&lt;uvMap')
      expect(html).not.toContain('```text')
    })

    it('should render indented code fences after list items', () => {
      const md = '- 闭环\n\n    ```text\n    UV producer -> HDRPipeline.runSync(... uvMapImage:) -> GainMapPipeline parent:<uvMap\n    ```'
      const html = AgenticRender.render(md, { sourceMap: true })
      expect(html).toContain('<ul')
      expect(html).toContain('ar-code-wrap')
      expect(html).toContain('text')
      expect(html).not.toContain('```text')
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

    it('should continue ordered list numbering across loose AI markdown', () => {
      const md = '1. **连接设备**\n\n用 `adb` 做截图。\n\n1. **内置 AI Chat**\n\n不是普通聊天窗口。'
      const html = AgenticRender.render(md)
      expect(html).toContain('<ol class="ar-ol">')
      expect(html).toContain('<ol class="ar-ol" start="2">')
      expect(html).toContain('连接设备')
      expect(html).toContain('内置 AI Chat')
    })

    it('should keep blank-line separated ordered items in one list', () => {
      const html = AgenticRender.render('1. alpha\n\n1. beta')
      expect(html.match(/<ol/g) || []).toHaveLength(1)
      expect(html.match(/<li/g) || []).toHaveLength(2)
    })

    it('should not render local or relative file links as anchors', () => {
      const html = AgenticRender.render('[funnelchart.png](/Users/foo/Desktop/funnelchart.png)\n\n[other.png](other.png)')
      expect(html).not.toContain('<a')
      expect(html).toContain('<code class="ar-inline-code">funnelchart.png</code>')
      expect(html).toContain('<code class="ar-inline-code">other.png</code>')
    })

    it('should not render local images as broken image tags', () => {
      const html = AgenticRender.render('![funnelchart.png](/Users/foo/Desktop/funnelchart.png)')
      expect(html).not.toContain('<img')
      expect(html).toContain('<code class="ar-inline-code">funnelchart.png</code>')
    })

    it('should still render remote images', () => {
      const html = AgenticRender.render('![chart](https://example.com/chart.png)')
      expect(html).toContain('<img')
      expect(html).toContain('src="https://example.com/chart.png"')
      expect(html).toContain('alt="chart"')
    })

    it('should escape HTML entities', () => {
      const html = AgenticRender.render('<script>alert("xss")</script>')
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('should annotate top-level source ranges when requested', () => {
      const md = '# Title\n\n```js\nconsole.log(1)\n```\n\n| Name | Value |\n| --- | --- |\n| A | 1 |'
      const html = AgenticRender.render(md, { sourceMap: true })
      expect(html).toContain('data-ar-source-start="0" data-ar-source-end="0"')
      expect(html).toContain('data-ar-source-start="2" data-ar-source-end="4"')
      expect(html).toContain('data-ar-source-start="6" data-ar-source-end="8"')
    })

    it('should pad table rows to the widest row without dropping cells', () => {
      const md = '| # | Layer | Z区域 (LTRB) | 尺寸 | 合成方式 | 说明 |\n|---|---|---|---|---|---|\n| 1 | Wallpaper | 1 | 0,0 -> 1200,2670 | 全屏 | DEVICE | 壁纸 |'
      const html = AgenticRender.render(md)
      container.innerHTML = html
      const cells = [...container.querySelectorAll('td')].map(cell => cell.textContent)
      expect(html.match(/<th[ >]/g) || []).toHaveLength(7)
      expect(html.match(/<td[ >]/g) || []).toHaveLength(7)
      expect(html).toContain('<th></th>')
      expect(cells.slice(-2)).toEqual(['DEVICE', '壁纸'])
    })

    it('should pad short table body rows with empty cells', () => {
      const md = '| A | B | C |\n|---|---|---|\n| 1 | 2 |'
      const html = AgenticRender.render(md)
      container.innerHTML = html
      const cells = [...container.querySelectorAll('td')].map(cell => cell.textContent)
      expect(html.match(/<th[ >]/g) || []).toHaveLength(3)
      expect(html.match(/<td[ >]/g) || []).toHaveLength(3)
      expect(cells).toEqual(['1', '2', ''])
    })

    it('should not split escaped pipes or inline-code pipes in table cells', () => {
      const md = '| Pattern | Description |\n|---|---|\n| `a|b` | uses escaped \\| delimiter |'
      const html = AgenticRender.render(md)
      expect(html.match(/<td[ >]/g) || []).toHaveLength(2)
      expect(html).toContain('<code class="ar-inline-code">a|b</code>')
      expect(html).toContain('<td>uses escaped | delimiter</td>')
    })
  })

  describe('source-aware selection', () => {
    it('should copy selected source markdown for code blocks and tables', () => {
      const md = '# Title\n\n```js\nconsole.log(1)\n```\n\n| Name | Value |\n| --- | --- |\n| A | 1 |'
      container.innerHTML = AgenticRender.render(md, { sourceMap: true })
      const codeText = container.querySelector('.ar-code').firstChild
      const tableText = container.querySelector('.ar-table td').firstChild
      const selection = {
        rangeCount: 1,
        getRangeAt: () => ({
          startContainer: codeText,
          endContainer: tableText,
          commonAncestorContainer: container,
        }),
      }
      expect(AgenticRender.selectionMarkdown(selection, md, { root: container })).toBe(
        '```js\nconsole.log(1)\n```\n\n| Name | Value |\n| --- | --- |\n| A | 1 |'
      )
    })

    it('should include source blocks intersecting the selection range', () => {
      const md = 'first\nsecond\nthird'
      container.innerHTML = AgenticRender.render(md, { sourceMap: true })
      const sourceNodes = [...container.querySelectorAll('[data-ar-source-start]')]
      const selection = {
        rangeCount: 1,
        getRangeAt: () => ({
          startContainer: sourceNodes[0].firstChild,
          endContainer: sourceNodes[2].firstChild,
          commonAncestorContainer: container,
          intersectsNode: node => sourceNodes.includes(node),
        }),
      }
      expect(AgenticRender.selectionMarkdown(selection, md, { root: container })).toBe('first\n\nsecond\n\nthird')
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

    it('should use translucent black blockquote background in dark theme', () => {
      const css = AgenticRender.getCSS()
      expect(css).toContain('--ar-bq-bg: rgba(0,0,0,.32);')
    })

    it('should keep Mermaid labels visible and task checkboxes free of accent square chrome', () => {
      const css = AgenticRender.getCSS()
      expect(css).toContain('.ar-mermaid-diagram svg foreignObject')
      expect(css).toContain('.ar-mermaid-diagram svg .nodeLabel p')
      expect(css).toContain('.ar-mermaid-diagram svg text.actor')
      expect(css).toContain('overflow: visible !important')
      expect(css).toContain('line-height: 1.25 !important')
      expect(css).toContain('color: var(--col-primary, #f4f4f5)')
      expect(css).toContain('.ar-checkbox-icon path')
      expect(css).not.toContain('#facc15')
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
