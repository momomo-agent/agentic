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

  it('gets and sets markdown value', async () => {
    editor = createEditor(container, { value: '# Initial' })
    await editor.ready

    expect(editor.getValue()).toContain('# Initial')

    editor.setValue('## Updated\n\nBody')

    expect(editor.getValue()).toContain('## Updated')
    expect(editor.getValue()).toContain('Body')
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
