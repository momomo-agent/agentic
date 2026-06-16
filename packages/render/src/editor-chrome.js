import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'

const EDITOR_CHROME_KEY = new PluginKey('AGENTIC_RENDER_EDITOR_CHROME')

function createCodeBlockView(node) {
  const dom = document.createElement('div')
  dom.className = 'ar-code-wrap'

  const header = document.createElement('div')
  header.className = 'ar-code-header'
  header.contentEditable = 'false'
  header.dataset.editorChrome = 'true'

  const pre = document.createElement('pre')
  pre.className = 'ar-pre'

  const code = document.createElement('code')
  code.className = 'ar-code'

  pre.appendChild(code)
  dom.append(header, pre)

  function sync(nextNode) {
    const language = String(nextNode.attrs.language || '').trim()
    header.textContent = language || 'code'
    if (language) {
      dom.dataset.language = language
      pre.dataset.language = language
    } else {
      delete dom.dataset.language
      delete pre.dataset.language
    }
  }

  sync(node)

  return {
    dom,
    contentDOM: code,
    update(nextNode) {
      if (nextNode.type !== node.type) return false
      node = nextNode
      sync(node)
      return true
    },
    ignoreMutation(record) {
      return header.contains(record.target) || record.target === dom || record.target === pre
    },
  }
}

function createTableView(node) {
  const dom = document.createElement('div')
  dom.className = 'ar-table-scroll'

  const table = document.createElement('table')
  table.className = 'ar-table'

  const tbody = document.createElement('tbody')
  table.appendChild(tbody)
  dom.appendChild(table)

  return {
    dom,
    contentDOM: tbody,
    update(nextNode) {
      if (nextNode.type !== node.type) return false
      node = nextNode
      return true
    },
    ignoreMutation(record) {
      return record.type === 'attributes' && (record.target === dom || record.target === table)
    },
  }
}

function createTaskCheckbox(node, getPos) {
  const checkbox = document.createElement('span')
  checkbox.className = `ar-checkbox${node.attrs.checked ? ' ar-checked' : ''}`
  checkbox.textContent = node.attrs.checked ? '✓' : ''
  checkbox.contentEditable = 'false'
  checkbox.dataset.editorChrome = 'true'
  checkbox.setAttribute('role', 'checkbox')
  checkbox.setAttribute('aria-checked', String(Boolean(node.attrs.checked)))
  checkbox.setAttribute('aria-label', node.attrs.checked ? 'Mark task incomplete' : 'Mark task complete')
  checkbox.addEventListener('mousedown', (event) => {
    event.preventDefault()
  })
  checkbox.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()

    const view = checkbox.__pmView
    const pos = typeof getPos === 'function' ? getPos() : undefined
    if (!view || typeof pos !== 'number') return

    const current = view.state.doc.nodeAt(pos)
    if (!current || current.type.name !== 'list_item' || current.attrs.checked == null) return

    view.dispatch(
      view.state.tr.setNodeMarkup(pos, undefined, {
        ...current.attrs,
        checked: !current.attrs.checked,
      }),
    )
  })
  return checkbox
}

function taskCheckboxDecorations(doc) {
  const decorations = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'list_item' || node.attrs.checked == null) return true
    decorations.push(Decoration.widget(
      pos + 1,
      (view) => {
        const checkbox = createTaskCheckbox(node, () => pos)
        checkbox.__pmView = view
        return checkbox
      },
      {
        key: `task-checkbox-${pos}-${Boolean(node.attrs.checked)}`,
        side: -1,
        stopEvent: (event) => event.type === 'mousedown' || event.type === 'click',
        ignoreSelection: true,
      },
    ))
    return true
  })
  return DecorationSet.create(doc, decorations)
}

function createEditorChromePlugin() {
  return new Plugin({
    key: EDITOR_CHROME_KEY,
    state: {
      init: (_, state) => taskCheckboxDecorations(state.doc),
      apply: (tr, decorations) => (
        tr.docChanged ? taskCheckboxDecorations(tr.doc) : decorations.map(tr.mapping, tr.doc)
      ),
    },
    props: {
      nodeViews: {
        code_block: (node) => createCodeBlockView(node),
        table: (node) => createTableView(node),
      },
      decorations(state) {
        return this.getState(state)
      },
    },
  })
}

export {
  EDITOR_CHROME_KEY,
  createEditorChromePlugin,
}
