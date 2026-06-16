const HTML_BREAK_VALUE_RE = /^<br\s*\/?\s*>$/i

function isHtmlBreakValue(value) {
  return HTML_BREAK_VALUE_RE.test(String(value || '').trim())
}

function inlineHtmlDomSpec(value) {
  const attrs = {
    'data-value': value,
    'data-type': 'html',
  }
  return isHtmlBreakValue(value) ? ['span', attrs, ['br']] : ['span', attrs, value]
}

export {
  HTML_BREAK_VALUE_RE,
  inlineHtmlDomSpec,
  isHtmlBreakValue,
}
