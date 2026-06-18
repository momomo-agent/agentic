// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

global.requestAnimationFrame = vi.fn((fn) => {
  fn()
  return 1
})
global.cancelAnimationFrame = vi.fn()

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

const { createEditor } = await import('../src/editor.js')
const { render } = await import('../src/index.js')

describe('AgenticRender editor', () => {
  let container
  let editor

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'editor-test-container'
    document.body.appendChild(container)
  })

  afterEach(async () => {
    if (editor) {
      await editor.destroy()
      editor = null
    }
    if (container?.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.clearAllMocks()
  })

  it('creates an editor instance', async () => {
    editor = createEditor(container, { value: '# Hello' })
    await editor.ready

    expect(editor.element).toBeInstanceOf(HTMLElement)
    expect(editor.element.className).toContain('ar-root')
    expect(typeof editor.getValue).toBe('function')
    expect(typeof editor.setValue).toBe('function')
    expect(container.querySelector('.ar-editor-content')).toBeTruthy()
  })

  it('keeps editor DOM semantic while moving edit chrome outside schema content', async () => {
    const markdown = [
      '# Title',
      '',
      'Body with **strong**, *emphasis*, ~~strike~~, [link](https://example.com), and `inline`.',
      '',
      '> Quote',
      '',
      '- [x] Done task',
      '- Plain item',
      '',
      '1. Ordered item',
      '',
      '![Alt](https://example.com/image.png)',
      '',
      '```js',
      'const value = 1',
      '```',
      '',
      '| Name | Value |',
      '| --- | --- |',
      '| a | b |',
    ].join('\n')

    editor = createEditor(container, { value: markdown })
    await editor.ready

    const previewHost = document.createElement('div')
    previewHost.innerHTML = render(markdown, { theme: 'dark' })

    const sharedSelectors = [
      'h1.ar-h.ar-h1',
      'p.ar-p',
      'strong.ar-strong',
      'em.ar-em',
      'del.ar-del',
      'a.ar-a',
      'code.ar-inline-code',
      'blockquote.ar-bq',
      'ul.ar-ul',
      'ol.ar-ol',
      'img.ar-img',
    ]

    sharedSelectors.forEach((selector) => {
      expect(previewHost.querySelector(selector), `preview missing ${selector}`).toBeTruthy()
      expect(editor.element.querySelector(selector), `editor missing ${selector}`).toBeTruthy()
    })

    expect(previewHost.querySelector('li.ar-li.ar-task > .ar-checkbox.ar-checked')).toBeTruthy()
    const editorCheckbox = editor.element.querySelector('li.ar-li.ar-task .ar-checkbox[data-editor-chrome="true"].ar-checked')
    expect(editorCheckbox).toBeTruthy()
    expect(editorCheckbox.classList.contains('ProseMirror-widget')).toBe(true)
    expect(editorCheckbox.textContent).toBe('')
    expect(editorCheckbox.querySelector('svg.ar-checkbox-icon path')?.getAttribute('fill')).toBe('currentColor')

    expect(previewHost.querySelector('div.ar-code-wrap > .ar-code-header')).toBeTruthy()
    expect(editor.element.querySelector('div.ar-code-wrap > .ar-code-header[data-editor-chrome="true"]')).toBeTruthy()
    expect(editor.element.querySelector('div.ar-code-wrap > pre.ar-pre > code.ar-code')).toBeTruthy()

    expect(previewHost.querySelector('div.ar-table-scroll > table.ar-table')).toBeTruthy()
    expect(editor.element.querySelector('div.ar-table-scroll > table.ar-table')).toBeTruthy()
  })

  it('aligns editor and preview table cell alignment contract', async () => {
    const markdown = [
      '| Left | Center | Right |',
      '| :--- | :---: | ---: |',
      '| a | b | c |',
    ].join('\n')

    editor = createEditor(container, { value: markdown })
    await editor.ready

    const previewHost = document.createElement('div')
    previewHost.innerHTML = render(markdown, { theme: 'dark' })

    const previewHeaders = [...previewHost.querySelectorAll('th')]
    const previewCells = [...previewHost.querySelectorAll('td')]
    const editorHeaders = [...editor.element.querySelectorAll('th')]
    const editorCells = [...editor.element.querySelectorAll('td')]

    expect(previewHeaders.map((node) => node.dataset.align)).toEqual(['left', 'center', 'right'])
    expect(previewCells.map((node) => node.dataset.align)).toEqual(['left', 'center', 'right'])
    expect(editorHeaders.map((node) => node.dataset.align)).toEqual(['left', 'center', 'right'])
    expect(editorCells.map((node) => node.dataset.align)).toEqual(['left', 'center', 'right'])

    expect(editor.getValue()).toContain('| :--- | :---: | ---: |')
  })

  it('gets and sets markdown value', async () => {
    editor = createEditor(container, { value: '# Initial' })
    await editor.ready

    expect(editor.getValue()).toContain('# Initial')

    editor.setValue('## Updated\n\nBody')

    expect(editor.getValue()).toContain('## Updated')
    expect(editor.getValue()).toContain('Body')
  })

  it('supports undo and redo keyboard shortcuts through ProseMirror history', async () => {
    editor = createEditor(container, { value: 'Initial' })
    await editor.ready

    const view = editor.element.querySelector('.ProseMirror')
    view.focus()
    document.execCommand?.('selectAll')

    view.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: 'Changed',
    }))

    if (!editor.getValue().includes('Changed')) {
      view.textContent = 'Changed'
      view.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: 'Changed',
      }))
    }

    expect(editor.getValue()).toContain('Changed')

    view.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    }))

    expect(editor.getValue()).toContain('Initial')

    view.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }))

    expect(editor.getValue()).toContain('Changed')
  })

  it('keeps code block transaction edits and selection stable across undo', async () => {
    editor = createEditor(container, {
      value: [
        '```js',
        'const value = 1',
        '```',
      ].join('\n'),
    })
    await editor.ready

    const view = editor.view
    expect(view).toBeTruthy()
    expect(editor.element.querySelector('.ar-code-header')?.getAttribute('contenteditable')).toBe('false')

    const originalText = 'const value = 1'
    const inserted = '\nconsole.log(value)'
    const insertPos = 1 + originalText.length
    view.dispatch(view.state.tr.insertText(inserted, insertPos))

    expect(editor.getValue()).toContain('console.log(value)')
    expect(view.state.selection.from).toBe(insertPos + inserted.length)

    view.dom.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    }))

    expect(editor.getValue()).toContain(originalText)
    expect(editor.getValue()).not.toContain('console.log(value)')
    expect(view.state.selection.from).toBeGreaterThan(0)
  })

  it('keeps task checkbox chrome out of text and toggles checked through transactions', async () => {
    editor = createEditor(container, { value: '- [ ] Todo' })
    await editor.ready

    const checkbox = editor.element.querySelector('.ar-checkbox[data-editor-chrome="true"]')
    const taskItem = editor.element.querySelector('li.ar-task')

    expect(checkbox).toBeTruthy()
    expect(checkbox.classList.contains('ProseMirror-widget')).toBe(true)
    expect(checkbox.textContent).toBe('')
    expect(checkbox.querySelector('svg.ar-checkbox-icon path')?.getAttribute('fill')).toBe('currentColor')
    expect(taskItem?.textContent).toBe('Todo')
    expect(editor.getValue()).toMatch(/[*-] \[ \] Todo/)

    checkbox.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }))

    expect(editor.getValue()).toMatch(/[*-] \[x\] Todo/)

    editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    }))

    expect(editor.getValue()).toMatch(/[*-] \[ \] Todo/)
  })

  it('renders inline html break nodes without update-time DOM mutation', async () => {
    editor = createEditor(container, { value: 'a<br>b' })
    await editor.ready

    const htmlBreak = editor.element.querySelector('span[data-type="html"][data-value="<br>"]')
    expect(htmlBreak?.querySelector('br')).toBeTruthy()
    expect(editor.getValue()).toContain('<br>')
  })

  it('toggles editable state', async () => {
    editor = createEditor(container, { value: 'Editable', editable: true })
    await editor.ready

    expect(editor.isEditable()).toBe(true)

    editor.setEditable(false)

    expect(editor.isEditable()).toBe(false)
    expect(editor.element.dataset.editable).toBe('false')
    expect(editor.element.querySelector('[contenteditable="false"]')).toBeTruthy()

    editor.setEditable(true)

    expect(editor.isEditable()).toBe(true)
    expect(editor.element.dataset.editable).toBe('true')
  })

  it('returns heading tree', async () => {
    editor = createEditor(container, {
      value: '# Title\n\n## Section\n\n### Detail',
    })
    await editor.ready

    expect(editor.getHeadings()).toEqual([
      { id: 'title', level: 1, text: 'Title' },
      { id: 'section', level: 2, text: 'Section' },
      { id: 'detail', level: 3, text: 'Detail' },
    ])
  })

  it('calls onChange after edits', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    editor = createEditor(container, { value: 'Initial', onChange })
    await editor.ready

    const editable = editor.element.querySelector('[contenteditable="true"]')
    editable.textContent = 'Changed'
    editable.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: 'Changed',
    }))

    await vi.advanceTimersByTimeAsync(550)

    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls.at(-1)[0]).toContain('Changed')
    vi.useRealTimers()
  })

  it('calls onSave for Cmd+S and Ctrl+S', async () => {
    const onSave = vi.fn()
    editor = createEditor(container, { value: 'Save me', onSave })
    await editor.ready

    editor.element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    }))

    editor.element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }))

    expect(onSave).toHaveBeenCalledTimes(2)
    expect(onSave.mock.calls[0][0]).toContain('Save me')
  })

  it('scrolls to a heading by id', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    editor = createEditor(container, { value: '# Title' })
    await editor.ready

    expect(editor.scrollToHeading('title')).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
    expect(editor.scrollToHeading('missing')).toBe(false)
  })

  it('cleans up DOM on destroy', async () => {
    editor = createEditor(container, { value: 'To remove' })
    await editor.ready

    const root = editor.element
    expect(container.contains(root)).toBe(true)

    await editor.destroy()
    editor = null

    expect(container.contains(root)).toBe(false)
    expect(container.innerHTML).toBe('')
  })
})
