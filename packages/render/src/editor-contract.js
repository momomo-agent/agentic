import {
  blockquoteSchema,
  bulletListSchema,
  codeBlockSchema,
  emphasisSchema,
  headingSchema,
  hrSchema,
  imageSchema,
  htmlSchema,
  inlineCodeSchema,
  linkSchema,
  orderedListSchema,
  paragraphSchema,
  strongSchema,
} from '@milkdown/preset-commonmark'
import {
  extendListItemSchemaForTask,
  strikethroughSchema,
  tableCellSchema,
  tableHeaderSchema,
  tableSchema,
} from '@milkdown/preset-gfm'
import { inlineHtmlDomSpec } from './editor-html-breaks.js'

function dataAttrs(attrs = {}) {
  const out = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

function headingClass(level) {
  return `ar-h ar-h${level}`
}

function isDomAttrs(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function splitDomSpec(spec) {
  const [tag, maybeAttrs, ...rest] = spec
  if (isDomAttrs(maybeAttrs)) {
    return {
      tag,
      attrs: maybeAttrs,
      content: rest,
    }
  }
  return {
    tag,
    attrs: {},
    content: [maybeAttrs, ...rest].filter((value) => value !== undefined),
  }
}

function mergeStyleValue(baseStyle, extraStyle) {
  if (!baseStyle) return extraStyle
  if (!extraStyle) return baseStyle
  return `${String(baseStyle).replace(/;\s*$/, '')}; ${extraStyle}`
}

function mergeDomAttrs(baseAttrs = {}, extraAttrs = {}) {
  const merged = {
    ...baseAttrs,
    ...extraAttrs,
  }
  const className = [baseAttrs.class, extraAttrs.class].filter(Boolean).join(' ')
  if (className) {
    merged.class = className
  } else {
    delete merged.class
  }

  const style = mergeStyleValue(baseAttrs.style, extraAttrs.style)
  if (style) {
    merged.style = style
  } else {
    delete merged.style
  }

  return dataAttrs(merged)
}

function renderBaseDom(base, node, fallbackSpec) {
  const spec = typeof base?.toDOM === 'function' ? base.toDOM(node) : fallbackSpec
  return Array.isArray(spec) ? spec : fallbackSpec
}

function withDomAttrs(spec, extraAttrs = {}) {
  const { tag, attrs, content } = splitDomSpec(spec)
  return [tag, mergeDomAttrs(attrs, extraAttrs), ...content]
}

function listItemTaskSpec(baseSpec, node) {
  const { tag, attrs, content } = splitDomSpec(baseSpec)
  return [
    tag,
    mergeDomAttrs(attrs, {
      class: node.attrs.checked == null ? 'ar-li' : 'ar-li ar-task',
      'data-item-type': node.attrs.checked == null ? undefined : 'task',
      'data-checked': node.attrs.checked == null ? undefined : String(Boolean(node.attrs.checked)),
    }),
    ...content,
  ]
}

function normalizeTableAlign(value) {
  return ['left', 'center', 'right'].includes(value) ? value : 'left'
}

function tableCellAlignAttrs(node) {
  const align = normalizeTableAlign(node.attrs?.alignment)
  return {
    'data-align': align,
    style: `text-align: ${align}`,
  }
}

function renderCodeBlock(node) {
  const language = String(node.attrs.language || '').trim()
  return [
    'pre',
    {
      class: 'ar-pre',
      ...(language ? { 'data-language': language } : {}),
    },
    ['code', { class: 'ar-code' }, 0],
  ]
}

export const headingContractSchema = headingSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (node) => {
      const level = Number(node.attrs.level || 1)
      return withDomAttrs(
        renderBaseDom(base, node, [`h${level}`, 0]),
        { class: headingClass(level) },
      )
    },
  }
})

export const paragraphContractSchema = paragraphSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (node) => withDomAttrs(renderBaseDom(base, node, ['p', 0]), { class: 'ar-p' }),
  }
})

export const blockquoteContractSchema = blockquoteSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (node) => withDomAttrs(renderBaseDom(base, node, ['blockquote', 0]), { class: 'ar-bq' }),
  }
})

export const bulletListContractSchema = bulletListSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (node) => withDomAttrs(renderBaseDom(base, node, ['ul', 0]), { class: 'ar-ul' }),
  }
})

export const orderedListContractSchema = orderedListSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (node) => withDomAttrs(renderBaseDom(base, node, ['ol', 0]), { class: 'ar-ol' }),
  }
})

export const listItemContractSchema = extendListItemSchemaForTask.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    parseDOM: [
      {
        tag: 'li.ar-task',
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) return false
          const checkbox = dom.querySelector(':scope > .ar-checkbox')
          return {
            label: dom.dataset.label,
            listType: dom.dataset.listType,
            spread: dom.dataset.spread === 'true',
            checked: dom.dataset.checked != null
              ? dom.dataset.checked === 'true'
              : (checkbox ? checkbox.classList.contains('ar-checked') : null),
          }
        },
      },
      ...(base.parseDOM || []),
    ],
    toDOM: (node) => {
      const baseSpec = renderBaseDom(base, node, ['li', 0])
      return listItemTaskSpec(baseSpec, node)
    },
  }
})

export const hrContractSchema = hrSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (node) => withDomAttrs(renderBaseDom(base, node, ['hr']), { class: 'ar-hr' }),
  }
})

export const imageContractSchema = imageSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (node) => withDomAttrs(
      renderBaseDom(base, node, ['img']),
      {
        class: 'ar-img',
        loading: 'lazy',
      },
    ),
  }
})

export const codeBlockContractSchema = codeBlockSchema.extendSchema((prev) => (ctx) => ({
  ...prev(ctx),
  toDOM: (node) => renderCodeBlock(node),
}))

export const htmlBreakContractSchema = htmlSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (node) => {
      const value = String(node.attrs.value || '')
      return inlineHtmlDomSpec(value)
    },
  }
})

export const strongContractSchema = strongSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (mark) => withDomAttrs(renderBaseDom(base, mark, ['strong']), { class: 'ar-strong' }),
  }
})

export const emphasisContractSchema = emphasisSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (mark) => withDomAttrs(renderBaseDom(base, mark, ['em']), { class: 'ar-em' }),
  }
})

export const strikethroughContractSchema = strikethroughSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (mark) => withDomAttrs(renderBaseDom(base, mark, ['del']), { class: 'ar-del' }),
  }
})

export const linkContractSchema = linkSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (mark) => withDomAttrs(
      renderBaseDom(base, mark, ['a']),
      {
        class: 'ar-a',
        target: '_blank',
        rel: 'noopener',
      },
    ),
  }
})

export const inlineCodeContractSchema = inlineCodeSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (mark) => withDomAttrs(renderBaseDom(base, mark, ['code']), { class: 'ar-inline-code' }),
  }
})

export const tableContractSchema = tableSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (node) => withDomAttrs(
      renderBaseDom(base, node, ['table', ['tbody', 0]]),
      { class: 'ar-table' },
    ),
  }
})

export const tableCellContractSchema = tableCellSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (node) => withDomAttrs(
      renderBaseDom(base, node, ['td', 0]),
      tableCellAlignAttrs(node),
    ),
  }
})

export const tableHeaderContractSchema = tableHeaderSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx)
  return {
    ...base,
    toDOM: (node) => withDomAttrs(
      renderBaseDom(base, node, ['th', 0]),
      tableCellAlignAttrs(node),
    ),
  }
})

export const EDITOR_CONTRACT_PLUGINS = [
  headingContractSchema,
  paragraphContractSchema,
  blockquoteContractSchema,
  bulletListContractSchema,
  orderedListContractSchema,
  listItemContractSchema,
  hrContractSchema,
  imageContractSchema,
  codeBlockContractSchema,
  htmlBreakContractSchema,
  strongContractSchema,
  emphasisContractSchema,
  strikethroughContractSchema,
  linkContractSchema,
  inlineCodeContractSchema,
  tableContractSchema,
  tableCellContractSchema,
  tableHeaderContractSchema,
]
