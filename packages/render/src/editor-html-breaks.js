const HTML_BREAK_VALUE_RE = /^<br\s*\/?\s*>$/i

function isHtmlBreakValue(value) {
  return HTML_BREAK_VALUE_RE.test(String(value || '').trim())
}

function syncInlineHtmlBreakNodes(root) {
  if (!root?.querySelectorAll) return

  const ownerDocument = root.ownerDocument
  if (!ownerDocument?.createElement) return

  root.querySelectorAll('span[data-type="html"][data-value]').forEach((node) => {
    const value = node.getAttribute('data-value')
    if (!isHtmlBreakValue(value)) return

    const hasRenderedBreak = (
      node.childNodes.length === 1
      && node.firstChild?.nodeName === 'BR'
    )
    if (hasRenderedBreak) return

    node.replaceChildren(ownerDocument.createElement('br'))
  })
}

export {
  HTML_BREAK_VALUE_RE,
  isHtmlBreakValue,
  syncInlineHtmlBreakNodes,
}
