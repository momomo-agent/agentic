import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  parserCtx,
  rootCtx,
  serializerCtx,
} from '@milkdown/core'
import { commonmark, headingIdGenerator } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { prism, prismConfig } from '@milkdown/plugin-prism'
import { refractor } from 'refractor'
import { getCSS, THEME_DARK, THEME_LIGHT } from './index.js'
import { EDITOR_CSS, getEditorCSS } from './editor-styles.js'

const CHANGE_DEBOUNCE_MS = 300
const BASE_STYLE_ID = 'agentic-render-editor-base-styles'
const EDITOR_STYLE_ID = 'agentic-render-editor-styles'

function injectStyles() {
  if (typeof document === 'undefined') return

  upsertStyle(BASE_STYLE_ID, getCSS('dark'))
  upsertStyle(EDITOR_STYLE_ID, EDITOR_CSS)
}

function upsertStyle(id, cssText) {
  if (!cssText) return

  let style = document.getElementById(id)
  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement('style')
    style.id = id
  }
  if (style.textContent !== cssText) {
    style.textContent = cssText
  }
  document.head.appendChild(style)
}

function resolveTarget(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el) throw new Error(`agentic-render/editor: target "${target}" not found`)
  return el
}

function themeVars(name) {
  return name === 'light' ? THEME_LIGHT : THEME_DARK
}

function normalizeTheme(name) {
  return name === 'light' ? 'light' : 'dark'
}

function applyTheme(root, name, customVars = {}) {
  const vars = { ...themeVars(name), ...customVars }
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

function toMarkdown(value) {
  return value == null ? '' : String(value)
}

function slugHeadingText(text) {
  return String(text || '').toLowerCase().trim().replace(/\s+/g, '-')
}

function headingIdForNode(node, usedIds) {
  if (node.attrs?.id) return node.attrs.id

  const base = slugHeadingText(node.textContent)
  if (!base) return ''

  usedIds[base] = (usedIds[base] || 0) + 1
  return usedIds[base] > 1 ? `${base}-#${usedIds[base]}` : base
}

function cssAttributeValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function createEditor(target, options = {}) {
  injectStyles()

  const host = resolveTarget(target)
  const root = document.createElement('div')
  const content = document.createElement('div')

  root.className = `ar-root ar-editor ${options.className || ''}`.trim()
  content.className = 'ar-editor-content'
  root.appendChild(content)
  host.appendChild(root)

  let theme = normalizeTheme(options.theme)
  const customVars = options.vars || {}
  let markdown = toMarkdown(options.value)
  let editable = options.editable !== false
  let placeholder = options.placeholder || ''
  let milkdownEditor = null
  let view = null
  let destroyed = false
  let pendingMarkdown = null
  let changeTimer = null
  let initError = null

  applyTheme(root, theme, customVars)
  root.dataset.theme = theme
  root.dataset.editable = String(editable)

  function getViewProps() {
    return {
      editable: () => editable,
      attributes: {
        'data-placeholder': placeholder,
        'aria-label': placeholder || 'Markdown editor',
      },
    }
  }

  function clearChangeTimer() {
    if (!changeTimer) return
    clearTimeout(changeTimer)
    changeTimer = null
  }

  function scheduleChange(nextMarkdown) {
    if (typeof options.onChange !== 'function') return
    clearChangeTimer()
    changeTimer = setTimeout(() => {
      changeTimer = null
      options.onChange(nextMarkdown)
    }, CHANGE_DEBOUNCE_MS)
  }

  function updatePlaceholderState() {
    if (!view) return
    view.dom.setAttribute('data-placeholder', placeholder)

    const firstBlock = view.dom.firstElementChild
    if (!firstBlock) return

    const isEmpty = view.state.doc.childCount === 1 && view.state.doc.textContent.length === 0
    firstBlock.classList.toggle('is-editor-empty', isEmpty)
  }

  function syncViewProps() {
    if (!view) return
    view.setProps(getViewProps())
    root.dataset.editable = String(editable)
    updatePlaceholderState()
  }

  function replaceEditorDoc(nextMarkdown) {
    if (!milkdownEditor || !view) {
      pendingMarkdown = nextMarkdown
      return
    }

    milkdownEditor.action((ctx) => {
      const parser = ctx.get(parserCtx)
      const nextDoc = parser(nextMarkdown)
      const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, nextDoc.content)
      tr.setMeta('addToHistory', false)
      view.dispatch(tr)
    })
    updatePlaceholderState()
  }

  function readEditorMarkdown() {
    if (!milkdownEditor || !view) return markdown

    try {
      return milkdownEditor.action((ctx) => {
        const serializer = ctx.get(serializerCtx)
        return serializer(view.state.doc)
      })
    } catch {
      return markdown
    }
  }

  function handleSave(event) {
    const key = String(event.key || '').toLowerCase()
    if (key !== 's' || !(event.metaKey || event.ctrlKey)) return

    event.preventDefault()
    event.stopPropagation()
    if (typeof options.onSave === 'function') {
      options.onSave(api.getValue())
    }
  }

  root.addEventListener('keydown', handleSave)

  async function initialize() {
    milkdownEditor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, content)
        ctx.set(defaultValueCtx, markdown)
        ctx.set(headingIdGenerator.key, (node) => slugHeadingText(node.textContent))
        ctx.set(prismConfig.key, { configureRefractor: () => refractor })
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          ...getViewProps(),
        }))

        ctx.get(listenerCtx)
          .mounted((mountedCtx) => {
            view = mountedCtx.get(editorViewCtx)
            syncViewProps()
            if (pendingMarkdown != null) {
              const nextMarkdown = pendingMarkdown
              pendingMarkdown = null
              markdown = nextMarkdown
              replaceEditorDoc(nextMarkdown)
            } else {
              pendingMarkdown = null
            }

            if (destroyed) {
              milkdownEditor?.destroy(true)
            }
          })
          .updated(() => {
            updatePlaceholderState()
          })
          .markdownUpdated((_ctx, nextMarkdown) => {
            markdown = nextMarkdown
            updatePlaceholderState()
            scheduleChange(nextMarkdown)
          })
      })
      .use(commonmark)
      .use(gfm)
      .use(prism)
      .use(listener)
      .create()

    return api
  }

  const ready = initialize().catch((error) => {
    initError = error
    throw error
  })
  ready.catch(() => {})

  const api = {
    getValue() {
      if (initError) return markdown
      markdown = readEditorMarkdown()
      return markdown
    },

    setValue(nextMarkdown) {
      markdown = toMarkdown(nextMarkdown)
      clearChangeTimer()
      replaceEditorDoc(markdown)
    },

    setEditable(nextEditable) {
      editable = Boolean(nextEditable)
      root.dataset.editable = String(editable)
      syncViewProps()
    },

    isEditable() {
      return editable
    },

    focus() {
      if (view) {
        view.focus()
      } else if (typeof content.focus === 'function') {
        content.focus()
      }
    },

    scrollToHeading(id) {
      const heading = content.querySelector(`[id="${cssAttributeValue(id)}"]`)
      if (!heading) return false
      if (typeof heading.scrollIntoView === 'function') {
        heading.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
      return true
    },

    getHeadings() {
      if (!view) return []

      const headings = []
      const usedIds = {}
      view.state.doc.descendants((node) => {
        if (node.type.name !== 'heading') return

        const text = node.textContent
        const id = headingIdForNode(node, usedIds)
        headings.push({
          id,
          level: node.attrs.level,
          text,
        })
      })
      return headings
    },

    setTheme(nextTheme) {
      theme = normalizeTheme(nextTheme)
      root.dataset.theme = theme
      applyTheme(root, theme, customVars)
    },

    destroy() {
      destroyed = true
      clearChangeTimer()
      root.removeEventListener('keydown', handleSave)
      root.remove()
      view = null
      const destroyPromise = milkdownEditor?.destroy(true)
      milkdownEditor = null
      return destroyPromise
    },

    get element() {
      return root
    },

    ready,
  }

  return api
}

export { createEditor, getEditorCSS }
