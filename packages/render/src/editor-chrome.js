import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'

const EDITOR_CHROME_KEY = new PluginKey('AGENTIC_RENDER_EDITOR_CHROME')
const CHECK_TRUE_PATH = 'M9.99219 18.0298C8.8776 18.0298 7.83333 17.8188 6.85938 17.397C5.88542 16.9803 5.02865 16.4022 4.28906 15.6626C3.54948 14.923 2.96875 14.0662 2.54688 13.0923C2.13021 12.1183 1.92188 11.0741 1.92188 9.95947C1.92188 8.84489 2.13021 7.80062 2.54688 6.82666C2.96875 5.84749 3.54948 4.99072 4.28906 4.25635C5.02865 3.51676 5.88542 2.93864 6.85938 2.52197C7.83333 2.1001 8.8776 1.88916 9.99219 1.88916C11.1068 1.88916 12.151 2.1001 13.125 2.52197C14.1042 2.93864 14.9635 3.51676 15.7031 4.25635C16.4427 4.99072 17.0208 5.84749 17.4375 6.82666C17.8594 7.80062 18.0703 8.84489 18.0703 9.95947C18.0703 11.0741 17.8594 12.1183 17.4375 13.0923C17.0208 14.0662 16.4427 14.923 15.7031 15.6626C14.9635 16.4022 14.1042 16.9803 13.125 17.397C12.151 17.8188 11.1068 18.0298 9.99219 18.0298ZM9.125 13.811C9.27083 13.811 9.40365 13.7772 9.52344 13.7095C9.64844 13.6418 9.75781 13.5402 9.85156 13.4048L13.5078 7.70166C13.5599 7.61833 13.6068 7.52979 13.6484 7.43604C13.6901 7.33708 13.7109 7.24333 13.7109 7.15479C13.7109 6.95166 13.6328 6.7876 13.4766 6.6626C13.3255 6.5376 13.1536 6.4751 12.9609 6.4751C12.7057 6.4751 12.4948 6.61051 12.3281 6.88135L9.09375 12.0532L7.59375 10.147C7.48958 10.0168 7.38802 9.92562 7.28906 9.87354C7.1901 9.82145 7.07812 9.79541 6.95312 9.79541C6.75521 9.79541 6.58594 9.86833 6.44531 10.0142C6.3099 10.1548 6.24219 10.3241 6.24219 10.522C6.24219 10.6209 6.26042 10.7173 6.29688 10.811C6.33333 10.9048 6.38542 10.9959 6.45312 11.0845L8.36719 13.4126C8.48177 13.5532 8.59896 13.6548 8.71875 13.7173C8.83854 13.7798 8.97396 13.811 9.125 13.811Z'
const CHECK_FALSE_PATH = 'M9.99219 18.0298C8.8776 18.0298 7.83333 17.8188 6.85938 17.397C5.88542 16.9803 5.02865 16.4022 4.28906 15.6626C3.54948 14.9282 2.96875 14.0741 2.54688 13.1001C2.13021 12.1209 1.92188 11.0741 1.92188 9.95947C1.92188 8.84489 2.13021 7.80062 2.54688 6.82666C2.96875 5.84749 3.54948 4.98812 4.28906 4.24854C5.02865 3.50895 5.88542 2.93083 6.85938 2.51416C7.83333 2.09749 8.8776 1.88916 9.99219 1.88916C11.1068 1.88916 12.151 2.09749 13.125 2.51416C14.1042 2.93083 14.9635 3.50895 15.7031 4.24854C16.4427 4.98812 17.0208 5.84749 17.4375 6.82666C17.8594 7.80062 18.0703 8.84489 18.0703 9.95947C18.0703 11.0741 17.8594 12.1209 17.4375 13.1001C17.0208 14.0741 16.4427 14.9282 15.7031 15.6626C14.9635 16.4022 14.1042 16.9803 13.125 17.397C12.151 17.8188 11.1068 18.0298 9.99219 18.0298ZM9.99219 16.436C10.888 16.436 11.7266 16.2668 12.5078 15.9282C13.2891 15.5949 13.9766 15.1313 14.5703 14.5376C15.1693 13.9438 15.6354 13.2563 15.9688 12.4751C16.3021 11.6938 16.4688 10.8553 16.4688 9.95947C16.4688 9.06364 16.3021 8.2251 15.9688 7.44385C15.6354 6.65739 15.1693 5.96989 14.5703 5.38135C13.9766 4.7876 13.2891 4.32406 12.5078 3.99072C11.7266 3.65218 10.888 3.48291 9.99219 3.48291C9.10156 3.48291 8.26302 3.65218 7.47656 3.99072C6.69531 4.32406 6.00781 4.7876 5.41406 5.38135C4.82031 5.96989 4.35417 6.65739 4.01562 7.44385C3.68229 8.2251 3.51562 9.06364 3.51562 9.95947C3.51562 10.8553 3.68229 11.6938 4.01562 12.4751C4.35417 13.2563 4.82031 13.9438 5.41406 14.5376C6.00781 15.1313 6.69531 15.5949 7.47656 15.9282C8.26302 16.2668 9.10156 16.436 9.99219 16.436Z'

function renderCheckboxIcon(checked) {
  const namespace = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(namespace, 'svg')
  svg.classList.add('ar-checkbox-icon')
  svg.setAttribute('width', '20')
  svg.setAttribute('height', '20')
  svg.setAttribute('viewBox', '0 0 20 20')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')

  const path = document.createElementNS(namespace, 'path')
  path.setAttribute('d', checked ? CHECK_TRUE_PATH : CHECK_FALSE_PATH)
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)
  return svg
}

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
  checkbox.appendChild(renderCheckboxIcon(Boolean(node.attrs.checked)))
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
