/**
 * agentic-render — Streaming Markdown renderer
 */

// ── Syntax highlight (minimal, covers 90% of AI output) ──────────

  const CHECK_TRUE_PATH = 'M9.99219 18.0298C8.8776 18.0298 7.83333 17.8188 6.85938 17.397C5.88542 16.9803 5.02865 16.4022 4.28906 15.6626C3.54948 14.923 2.96875 14.0662 2.54688 13.0923C2.13021 12.1183 1.92188 11.0741 1.92188 9.95947C1.92188 8.84489 2.13021 7.80062 2.54688 6.82666C2.96875 5.84749 3.54948 4.99072 4.28906 4.25635C5.02865 3.51676 5.88542 2.93864 6.85938 2.52197C7.83333 2.1001 8.8776 1.88916 9.99219 1.88916C11.1068 1.88916 12.151 2.1001 13.125 2.52197C14.1042 2.93864 14.9635 3.51676 15.7031 4.25635C16.4427 4.99072 17.0208 5.84749 17.4375 6.82666C17.8594 7.80062 18.0703 8.84489 18.0703 9.95947C18.0703 11.0741 17.8594 12.1183 17.4375 13.0923C17.0208 14.0662 16.4427 14.923 15.7031 15.6626C14.9635 16.4022 14.1042 16.9803 13.125 17.397C12.151 17.8188 11.1068 18.0298 9.99219 18.0298ZM9.125 13.811C9.27083 13.811 9.40365 13.7772 9.52344 13.7095C9.64844 13.6418 9.75781 13.5402 9.85156 13.4048L13.5078 7.70166C13.5599 7.61833 13.6068 7.52979 13.6484 7.43604C13.6901 7.33708 13.7109 7.24333 13.7109 7.15479C13.7109 6.95166 13.6328 6.7876 13.4766 6.6626C13.3255 6.5376 13.1536 6.4751 12.9609 6.4751C12.7057 6.4751 12.4948 6.61051 12.3281 6.88135L9.09375 12.0532L7.59375 10.147C7.48958 10.0168 7.38802 9.92562 7.28906 9.87354C7.1901 9.82145 7.07812 9.79541 6.95312 9.79541C6.75521 9.79541 6.58594 9.86833 6.44531 10.0142C6.3099 10.1548 6.24219 10.3241 6.24219 10.522C6.24219 10.6209 6.26042 10.7173 6.29688 10.811C6.33333 10.9048 6.38542 10.9959 6.45312 11.0845L8.36719 13.4126C8.48177 13.5532 8.59896 13.6548 8.71875 13.7173C8.83854 13.7798 8.97396 13.811 9.125 13.811Z'
  const CHECK_FALSE_PATH = 'M9.99219 18.0298C8.8776 18.0298 7.83333 17.8188 6.85938 17.397C5.88542 16.9803 5.02865 16.4022 4.28906 15.6626C3.54948 14.9282 2.96875 14.0741 2.54688 13.1001C2.13021 12.1209 1.92188 11.0741 1.92188 9.95947C1.92188 8.84489 2.13021 7.80062 2.54688 6.82666C2.96875 5.84749 3.54948 4.98812 4.28906 4.24854C5.02865 3.50895 5.88542 2.93083 6.85938 2.51416C7.83333 2.09749 8.8776 1.88916 9.99219 1.88916C11.1068 1.88916 12.151 2.09749 13.125 2.51416C14.1042 2.93083 14.9635 3.50895 15.7031 4.24854C16.4427 4.98812 17.0208 5.84749 17.4375 6.82666C17.8594 7.80062 18.0703 8.84489 18.0703 9.95947C18.0703 11.0741 17.8594 12.1209 17.4375 13.1001C17.0208 14.0741 16.4427 14.9282 15.7031 15.6626C14.9635 16.4022 14.1042 16.9803 13.125 17.397C12.151 17.8188 11.1068 18.0298 9.99219 18.0298ZM9.99219 16.436C10.888 16.436 11.7266 16.2668 12.5078 15.9282C13.2891 15.5949 13.9766 15.1313 14.5703 14.5376C15.1693 13.9438 15.6354 13.2563 15.9688 12.4751C16.3021 11.6938 16.4688 10.8553 16.4688 9.95947C16.4688 9.06364 16.3021 8.2251 15.9688 7.44385C15.6354 6.65739 15.1693 5.96989 14.5703 5.38135C13.9766 4.7876 13.2891 4.32406 12.5078 3.99072C11.7266 3.65218 10.888 3.48291 9.99219 3.48291C9.10156 3.48291 8.26302 3.65218 7.47656 3.99072C6.69531 4.32406 6.00781 4.7876 5.41406 5.38135C4.82031 5.96989 4.35417 6.65739 4.01562 7.44385C3.68229 8.2251 3.51562 9.06364 3.51562 9.95947C3.51562 10.8553 3.68229 11.6938 4.01562 12.4751C4.35417 13.2563 4.82031 13.9438 5.41406 14.5376C6.00781 15.1313 6.69531 15.5949 7.47656 15.9282C8.26302 16.2668 9.10156 16.436 9.99219 16.436Z'

  function renderCheckboxIcon(checked) {
    const path = checked ? CHECK_TRUE_PATH : CHECK_FALSE_PATH
    return `<svg class="ar-checkbox-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${path}" fill="currentColor"/></svg>`
  }

  const KEYWORDS = new Set([
    'async','await','break','case','catch','class','const','continue','debugger',
    'default','delete','do','else','export','extends','finally','for','from',
    'function','if','import','in','instanceof','let','new','of','return','static',
    'super','switch','this','throw','try','typeof','var','void','while','with','yield',
    // Python
    'def','elif','except','lambda','pass','raise','with','as','assert','global',
    'nonlocal','and','or','not','is','True','False','None',
    // Rust / Go
    'fn','pub','mod','use','impl','struct','enum','trait','mut','match','loop',
    'move','ref','self','Self','type','where','go','func','package','defer',
    'chan','select','interface','map','range','fallthrough',
  ])

  function highlightCode(code, lang) {
    // Token-based highlighter — avoids regex overlap issues
    const tokens = tokenize(code)
    return tokens.map(t => {
      const text = escHtml(t.value)
      if (t.type === 'string') return `<span class="ar-str">${text}</span>`
      if (t.type === 'comment') return `<span class="ar-cmt">${text}</span>`
      if (t.type === 'number') return `<span class="ar-num">${text}</span>`
      if (t.type === 'keyword') return `<span class="ar-kw">${text}</span>`
      if (t.type === 'function') return `<span class="ar-fn">${text}</span>`
      return text
    }).join('')
  }

  function tokenize(code) {
    const tokens = []
    let i = 0
    while (i < code.length) {
      // Block comments
      if (code[i] === '/' && code[i + 1] === '*') {
        const end = code.indexOf('*/', i + 2)
        const stop = end === -1 ? code.length : end + 2
        tokens.push({ type: 'comment', value: code.slice(i, stop) })
        i = stop
        continue
      }
      // Line comments //
      if (code[i] === '/' && code[i + 1] === '/') {
        const end = code.indexOf('\n', i)
        const stop = end === -1 ? code.length : end
        tokens.push({ type: 'comment', value: code.slice(i, stop) })
        i = stop
        continue
      }
      // Line comments # (Python-style, not inside a word)
      if (code[i] === '#' && (i === 0 || /[\s;({[]/.test(code[i - 1]))) {
        const end = code.indexOf('\n', i)
        const stop = end === -1 ? code.length : end
        tokens.push({ type: 'comment', value: code.slice(i, stop) })
        i = stop
        continue
      }
      // Strings
      if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
        const quote = code[i]
        let j = i + 1
        while (j < code.length) {
          if (code[j] === '\\') { j += 2; continue }
          if (code[j] === quote) { j++; break }
          if (quote !== '`' && code[j] === '\n') break
          j++
        }
        tokens.push({ type: 'string', value: code.slice(i, j) })
        i = j
        continue
      }
      // Numbers
      if (/\d/.test(code[i]) && (i === 0 || !/\w/.test(code[i - 1]))) {
        let j = i
        while (j < code.length && /[\d.eExXa-fA-F_]/.test(code[j])) j++
        tokens.push({ type: 'number', value: code.slice(i, j) })
        i = j
        continue
      }
      // Words (identifiers / keywords)
      if (/[a-zA-Z_$]/.test(code[i])) {
        let j = i
        while (j < code.length && /[\w$]/.test(code[j])) j++
        const word = code.slice(i, j)
        // Look ahead for function call
        let k = j
        while (k < code.length && code[k] === ' ') k++
        if (KEYWORDS.has(word)) {
          tokens.push({ type: 'keyword', value: word })
        } else if (code[k] === '(') {
          tokens.push({ type: 'function', value: word })
        } else {
          tokens.push({ type: 'plain', value: word })
        }
        i = j
        continue
      }
      // Everything else
      tokens.push({ type: 'plain', value: code[i] })
      i++
    }
    return tokens
  }

  // ── HTML escape ──────────────────────────────────────────────────

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function escAttr(s) {
    return escHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }

  // ── Markdown parser (streaming-safe) ─────────────────────────────

  function sourceAttrs(options, start, end = start) {
    if (!options?.sourceMap) return ''
    return ` data-ar-source-start="${start}" data-ar-source-end="${end}"`
  }

  function codeLanguage(info = '') {
    return String(info || '').trim().split(/\s+/)[0].toLowerCase()
  }

  function isMermaidLanguage(info = '') {
    const lang = codeLanguage(info)
    return lang === 'mermaid' || lang === 'mmd'
  }

  function renderCodeBlock(codeContent, codeLang, options, start, end, { streaming = false } = {}) {
    if (isMermaidLanguage(codeLang)) {
      return `<div class="ar-mermaid-wrap"${sourceAttrs(options, start, end)}><div class="ar-mermaid-header">${escHtml(codeLang || 'mermaid')}</div><div class="ar-mermaid" data-ar-mermaid-state="pending" data-ar-mermaid-streaming="${streaming ? 'true' : 'false'}"><pre class="ar-mermaid-source">${escHtml(codeContent)}</pre><div class="ar-mermaid-diagram"></div></div></div>`
    }
    const action = streaming
      ? '<span class="ar-streaming-dot"></span>'
      : '<button class="ar-copy" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent).then(()=>{this.textContent=\'Copied!\';setTimeout(()=>this.textContent=\'Copy\',1500)})">Copy</button>'
    return `<div class="ar-code-wrap"${sourceAttrs(options, start, end)}><div class="ar-code-header">${escHtml(codeLang || 'code')}${action}</div><pre class="ar-pre"><code class="ar-code">${highlightCode(codeContent, codeLang)}</code></pre></div>`
  }

  function splitTableRow(line) {
    const cells = []
    let cell = ''
    let inCodeSpan = false
    let codeSpanTicks = 0

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]

      if (ch === '\\' && line[i + 1] === '|') {
        cell += '|'
        i++
        continue
      }

      if (ch === '`') {
        let ticks = 1
        while (line[i + ticks] === '`') ticks++
        if (!inCodeSpan) {
          inCodeSpan = true
          codeSpanTicks = ticks
        } else if (ticks === codeSpanTicks) {
          inCodeSpan = false
          codeSpanTicks = 0
        }
        cell += line.slice(i, i + ticks)
        i += ticks - 1
        continue
      }

      if (ch === '|' && !inCodeSpan) {
        cells.push(cell)
        cell = ''
        continue
      }

      cell += ch
    }

    cells.push(cell)

    if (cells.length > 0 && cells[0].trim() === '') cells.shift()
    if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop()

    return cells
  }

  function tableCellsForColumns(row, count) {
    if (count <= 0) return []
    const cells = (row || []).slice(0, count)
    while (cells.length < count) cells.push('')
    return cells
  }

  function tableColumnCount(rows) {
    return rows.reduce((max, row) => Math.max(max, row?.length || 0), 0)
  }

  function tableAlignForSeparator(cell = '') {
    const value = String(cell || '').trim()
    if (!/^:?-{3,}:?$/.test(value)) return ''
    const left = value.startsWith(':')
    const right = value.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    if (left) return 'left'
    return ''
  }

  function tableAlignsForColumns(separatorRow, count) {
    const cells = tableCellsForColumns(separatorRow, count)
    return cells.map(tableAlignForSeparator)
  }

  function tableCellAttrs(align, { nowrap = false } = {}) {
    const styles = []
    if (align) styles.push(`text-align:${align}`)
    if (nowrap) styles.push('white-space:nowrap')

    const attrs = []
    if (align) attrs.push(`data-align="${align}"`)
    if (styles.length) attrs.push(`style="${styles.join(';')}"`)
    return attrs.length ? ` ${attrs.join(' ')}` : ''
  }

  function codeFenceInfo(line) {
    const match = line.match(/^([ \t]*)(`{3,})(.*)$/)
    if (!match) return null
    return {
      indent: match[1],
      info: match[3].trim(),
    }
  }

  function parseMarkdown(src, options = {}) {
    // Normalize line endings
    src = src.replace(/\r\n?/g, '\n')

    let html = ''
    const lines = src.split('\n')
    let i = 0
    let inCodeBlock = false
    let codeLang = ''
    let codeContent = ''
    let codeIndent = ''
    let inList = false
    let listType = ''
    let inBlockquote = false
    let blockquoteContent = ''
    let inTable = false
    let tableRows = []
    let tableStartLine = 0
    let tableEndLine = 0
    let orderedListNextStart = 1
    let codeStartLine = 0
    let blockquoteStartLine = 0
    let blockquoteEndLine = 0

    function nextNonEmptyLine(start) {
      for (let j = start; j < lines.length; j++) {
        if (lines[j].trim() !== '') return lines[j]
      }
      return ''
    }

    function isListLine(type, value) {
      if (type === 'ul') return /^(\s*)[-*+]\s+(.+)$/.test(value)
      if (type === 'ol') return /^(\s*)\d+[.)]\s+(.+)$/.test(value)
      return false
    }

    function resetOrderedList() {
      orderedListNextStart = 1
    }

    function flushBlockquote() {
      if (inBlockquote) {
        html += `<blockquote class="ar-bq"${sourceAttrs(options, blockquoteStartLine, blockquoteEndLine)}>${inlineMarkdown(blockquoteContent.trim())}</blockquote>`
        blockquoteContent = ''
        inBlockquote = false
      }
    }

    function flushList() {
      if (inList) {
        html += `</${listType}>`
        inList = false
      }
    }

    function flushTable() {
      if (inTable && tableRows.length > 0) {
        const headers = tableRows[0]
        const columnCount = tableColumnCount(tableRows)
        const columnAligns = tableAlignsForColumns(tableRows[1], columnCount)

        // Analyze column widths: find max text length per column (excluding separator row)
        const colMaxLen = Array(columnCount).fill(0)
        for (let r = 0; r < tableRows.length; r++) {
          if (r === 1) continue // skip separator
          const row = tableRows[r]
          if (!row) continue
          for (let c = 0; c < columnCount; c++) {
            const cellText = (row[c] || '').trim()
            if (cellText.length > colMaxLen[c]) colMaxLen[c] = cellText.length
          }
        }

        // Columns with short content get nowrap to prevent unnecessary wrapping
        const SHORT_THRESHOLD = 16
        const colNowrap = colMaxLen.map(len => len <= SHORT_THRESHOLD)

        let t = `<table class="ar-table"${sourceAttrs(options, tableStartLine, tableEndLine)}><thead><tr>`
        const headerCells = tableCellsForColumns(headers, columnCount)
        for (let c = 0; c < headerCells.length; c++) {
          let cellHtml = inlineMarkdown((headerCells[c] || '').trim())
          cellHtml = cellHtml.replace(/&lt;br\s*\/?&gt;/gi, '<br>')
          t += `<th${tableCellAttrs(columnAligns[c])}>${cellHtml}</th>`
        }
        t += '</tr></thead><tbody>'
        for (let r = 2; r < tableRows.length; r++) {
          t += '<tr>'
          const cells = tableCellsForColumns(tableRows[r], columnCount)
          for (let c = 0; c < cells.length; c++) {
            let cellHtml = inlineMarkdown((cells[c] || '').trim())
            // Restore <br> line breaks inside table cells
            cellHtml = cellHtml.replace(/&lt;br\s*\/?&gt;/gi, '<br>')
            t += `<td${tableCellAttrs(columnAligns[c], { nowrap: colNowrap[c] })}>${cellHtml}</td>`
          }
          t += '</tr>'
        }
        t += '</tbody></table>'
        html += `<div class="ar-table-scroll">${t}</div>`
        tableRows = []
        inTable = false
      }
    }

    while (i < lines.length) {
      const line = lines[i]

      // Code blocks. AI output often nests fences under list continuations,
      // so accept arbitrary leading whitespace as long as it is only indentation.
      const fence = codeFenceInfo(line)
      if (fence) {
        if (!inCodeBlock) {
          resetOrderedList()
          flushBlockquote(); flushList(); flushTable()
          inCodeBlock = true
          codeStartLine = i
          codeIndent = fence.indent
          codeLang = fence.info
          codeContent = ''
          i++
          continue
        } else {
          // Close code block
          html += renderCodeBlock(codeContent, codeLang, options, codeStartLine, i)
          inCodeBlock = false
          codeLang = ''
          codeContent = ''
          codeIndent = ''
          i++
          continue
        }
      }

      if (inCodeBlock) {
        // Strip the same indentation as the opening fence
        const stripped = codeIndent && line.startsWith(codeIndent)
          ? line.slice(codeIndent.length)
          : line
        codeContent += (codeContent ? '\n' : '') + stripped
        i++
        continue
      }

      // Table detection: line starts with | and contains at least one more |
      if (/^\|.+/.test(line) && line.indexOf('|', 1) > 0) {
        resetOrderedList()
        const cells = splitTableRow(line)
        if (!inTable) {
          flushBlockquote(); flushList()
          inTable = true
          tableStartLine = i
          tableRows = [cells]
        } else {
          // Skip separator row
          if (/^[\s|:-]+$/.test(line)) {
            tableRows.push(cells)
          } else {
            tableRows.push(cells)
          }
        }
        tableEndLine = i
        i++
        continue
      } else if (inTable) {
        flushTable()
      }

      // Blockquote
      if (/^>\s?/.test(line)) {
        resetOrderedList()
        flushList(); flushTable()
        if (!inBlockquote) blockquoteStartLine = i
        inBlockquote = true
        blockquoteEndLine = i
        blockquoteContent += line.replace(/^>\s?/, '') + '\n'
        i++
        continue
      } else if (inBlockquote) {
        flushBlockquote()
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        resetOrderedList()
        flushList(); flushTable(); flushBlockquote()
        const level = headingMatch[1].length
        html += `<h${level} class="ar-h ar-h${level}"${sourceAttrs(options, i)}>${inlineMarkdown(headingMatch[2])}</h${level}>`
        i++
        continue
      }

      // Horizontal rule
      if (/^(-{3,}|_{3,}|\*{3,})\s*$/.test(line)) {
        resetOrderedList()
        flushList(); flushTable(); flushBlockquote()
        html += `<hr class="ar-hr"${sourceAttrs(options, i)}>`
        i++
        continue
      }

      // Unordered list
      const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/)
      if (ulMatch) {
        flushTable(); flushBlockquote()
        if (!inList || listType !== 'ul') {
          resetOrderedList()
          flushList()
          html += '<ul class="ar-ul">'
          inList = true
          listType = 'ul'
        }
        // Check for task list
        const taskMatch = ulMatch[2].match(/^\[([ xX])\]\s*(.*)$/)
        if (taskMatch) {
          const checked = taskMatch[1] !== ' '
          html += `<li class="ar-li ar-task"${sourceAttrs(options, i)}><span class="ar-checkbox${checked ? ' ar-checked' : ''}" role="checkbox" aria-checked="${checked}">${renderCheckboxIcon(checked)}</span>${inlineMarkdown(taskMatch[2])}</li>`
        } else {
          html += `<li class="ar-li"${sourceAttrs(options, i)}>${inlineMarkdown(ulMatch[2])}</li>`
        }
        i++
        continue
      }

      // Ordered list
      const olMatch = line.match(/^(\s*)(\d+)[.)]\s+(.+)$/)
      if (olMatch) {
        flushTable(); flushBlockquote()
        if (!inList || listType !== 'ol') {
          flushList()
          const markerNumber = Number(olMatch[2])
          const startNumber = orderedListNextStart > 1 && markerNumber === 1
            ? orderedListNextStart
            : markerNumber
          html += `<ol class="ar-ol"${startNumber !== 1 ? ` start="${startNumber}"` : ''}>`
          orderedListNextStart = startNumber
          inList = true
          listType = 'ol'
        }
        html += `<li class="ar-li"${sourceAttrs(options, i)}>${inlineMarkdown(olMatch[3])}</li>`
        orderedListNextStart += 1
        i++
        continue
      }

      if (inList && line.trim() === '') {
        if (isListLine(listType, nextNonEmptyLine(i + 1))) {
          i++
          continue
        }
        flushList()
        i++
        continue
      }

      // Empty line
      if (line.trim() === '') {
        flushList()
        i++
        continue
      }

      // Paragraph
      flushList(); flushTable(); flushBlockquote()
      html += `<p class="ar-p"${sourceAttrs(options, i)}>${inlineMarkdown(line)}</p>`
      i++
    }

    // Handle unterminated code block (streaming!)
    if (inCodeBlock) {
      html += renderCodeBlock(codeContent, codeLang, options, codeStartLine, Math.max(codeStartLine, lines.length - 1), { streaming: true })
    }

    flushBlockquote()
    flushList()
    flushTable()

    return html
  }

  // ── Inline markdown ──────────────────────────────────────────────

  function inlineMarkdown(text) {
    const placeholders = []
    const stash = (html) => {
      const token = `\uE000AR${placeholders.length}\uE000`
      placeholders.push({ token, html })
      return token
    }

    let raw = text

    // Images
    raw = raw.replace(/!\[([^\]]*)\]\(([^)\n]+)\)/g, (_match, alt, target) => {
      const src = parseMarkdownTarget(target)
      if (!isRenderableImageSrc(src)) {
        return stash(`<code class="ar-inline-code">${escHtml(alt || src)}</code>`)
      }
      return stash(`<img class="ar-img" src="${escAttr(src)}" alt="${escAttr(alt)}" loading="lazy">`)
    })

    // Links
    raw = raw.replace(/(^|[^!])\[([^\]\n]+)\]\(([^)\n]+)\)/g, (_match, prefix, label, target) => {
      const href = parseMarkdownTarget(target)
      if (!isSafeExternalHref(href)) {
        return prefix + stash(`<code class="ar-inline-code">${escHtml(label)}</code>`)
      }
      return prefix + stash(`<a class="ar-a" href="${escAttr(href)}" target="_blank" rel="noopener">${escHtml(label)}</a>`)
    })

    let s = escHtml(raw)

    // Bold + italic
    s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="ar-strong"><em>$1</em></strong>')
    // Bold
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="ar-strong">$1</strong>')
    s = s.replace(/__(.+?)__/g, '<strong class="ar-strong">$1</strong>')
    // Italic
    s = s.replace(/\*(.+?)\*/g, '<em class="ar-em">$1</em>')
    s = s.replace(/_(.+?)_/g, '<em class="ar-em">$1</em>')
    // Strikethrough
    s = s.replace(/~~(.+?)~~/g, '<del class="ar-del">$1</del>')
    // Inline code
    s = s.replace(/`([^`]+?)`/g, '<code class="ar-inline-code">$1</code>')

    for (const { token, html } of placeholders) {
      s = s.replace(token, html)
    }

    return s
  }

  function parseMarkdownTarget(target) {
    const trimmed = target.trim()
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return trimmed.slice(1, -1).trim()
    }
    const targetMatch = trimmed.match(/^(\S+)(?:\s+["'][\s\S]*["'])?\s*$/)
    return targetMatch ? targetMatch[1] : trimmed
  }

  function isSafeExternalHref(href) {
    return /^(https?:|mailto:|tel:)/i.test(href)
  }

  function isRenderableImageSrc(src) {
    return /^(https?:|data:image\/|blob:)/i.test(src)
  }

  // ── Default styles ───────────────────────────────────────────────

  const THEME_DARK = {
    '--ar-bg': 'transparent',
    '--ar-text': '#e4e4e7',
    '--ar-text-2': '#a1a1aa',
    '--ar-text-3': '#71717a',
    '--ar-accent': '#f5c518',
    '--ar-link': '#60a5fa',
    '--ar-border': '#27272a',
    '--ar-code-bg': '#18181b',
    '--ar-code-header-bg': '#1f1f23',
    '--ar-inline-code-bg': '#27272a',
    '--ar-bq-border': '#3f3f46',
    '--ar-bq-bg': 'rgba(0,0,0,.32)',
    '--ar-hr': '#27272a',
    '--ar-table-header-bg': '#1f1f23',
    '--ar-table-border': '#27272a',
    '--ar-table-stripe': '#18181b08',
    // Syntax
    '--ar-syn-kw': '#c792ea',
    '--ar-syn-str': '#c3e88d',
    '--ar-syn-num': '#f78c6c',
    '--ar-syn-cmt': '#546e7a',
    '--ar-syn-fn': '#82aaff',
  }

  const THEME_LIGHT = {
    '--ar-bg': 'transparent',
    '--ar-text': '#18181b',
    '--ar-text-2': '#52525b',
    '--ar-text-3': '#a1a1aa',
    '--ar-accent': '#d97706',
    '--ar-link': '#2563eb',
    '--ar-border': '#e4e4e7',
    '--ar-code-bg': '#f4f4f5',
    '--ar-code-header-bg': '#e4e4e7',
    '--ar-inline-code-bg': '#f4f4f5',
    '--ar-bq-border': '#d4d4d8',
    '--ar-bq-bg': '#fafafa',
    '--ar-hr': '#e4e4e7',
    '--ar-table-header-bg': '#f4f4f5',
    '--ar-table-border': '#e4e4e7',
    '--ar-table-stripe': '#fafafa',
    // Syntax
    '--ar-syn-kw': '#8b5cf6',
    '--ar-syn-str': '#16a34a',
    '--ar-syn-num': '#ea580c',
    '--ar-syn-cmt': '#a1a1aa',
    '--ar-syn-fn': '#2563eb',
  }

  const BASE_CSS = `
.ar-root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.75;
  color: var(--ar-text);
  background: var(--ar-bg);
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* ── Typography ── */
.ar-h { font-weight: 600; letter-spacing: -0.02em; margin: 1.5em 0 0.6em; }
.ar-h:first-child { margin-top: 0; }
.ar-h1 { font-size: 1.65em; line-height: 1.2; }
.ar-h2 { font-size: 1.35em; line-height: 1.25; }
.ar-h3 { font-size: 1.15em; line-height: 1.3; }
.ar-h4, .ar-h5, .ar-h6 { font-size: 1em; }
.ar-p { margin: 0.75em 0; }
.ar-p:first-child { margin-top: 0; }
.ar-strong { font-weight: 600; color: var(--ar-text); }
.ar-em { font-style: italic; }
.ar-del { text-decoration: line-through; color: var(--ar-text-3); }
.ar-a { color: var(--ar-link); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.15s; }
.ar-a:hover { border-bottom-color: var(--ar-link); }

/* ── Code ── */
.ar-code-wrap {
  margin: 1em 0;
  border: 1px solid var(--ar-border);
  border-radius: 8px;
  overflow: hidden;
}
.ar-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: var(--ar-code-header-bg);
  font-size: 12px;
  color: var(--ar-text-3);
  font-family: inherit;
}
.ar-copy {
  background: none; border: none; color: var(--ar-text-3); cursor: pointer;
  font-size: 12px; padding: 2px 8px; border-radius: 4px; font-family: inherit;
  transition: color 0.15s;
}
.ar-copy:hover { color: var(--ar-text-2); }
.ar-pre {
  margin: 0;
  padding: 16px 18px;
  background: var(--ar-code-bg);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  font-size: 13.5px;
  line-height: 1.6;
}
.ar-pre::-webkit-scrollbar { display: none; }
.ar-code {
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  background: none;
  padding: 0;
}
.ar-mermaid-wrap {
  margin: 1em 0;
  border: 1px solid var(--ar-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--ar-code-bg);
}
.ar-mermaid-header {
  padding: 6px 14px;
  background: var(--ar-code-header-bg);
  font-size: 12px;
  color: var(--ar-text-3);
  font-family: inherit;
}
.ar-mermaid {
  padding: 16px 18px;
  overflow: auto;
  overscroll-behavior: contain;
  touch-action: none;
  scrollbar-width: none;
  -ms-overflow-style: none;
  position: relative;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}
.ar-mermaid.is-panning {
  cursor: grabbing;
}
.ar-mermaid-diagram {
  width: max-content;
  max-width: none;
  min-width: 240px;
  margin: 0 auto;
  min-height: 80px;
  overflow: visible;
  transform-origin: 0 0;
  transition: transform 0.1s ease-out;
  will-change: transform;
  user-select: none;
  -webkit-user-select: none;
}
.ar-mermaid-diagram svg {
  display: block;
  width: auto;
  max-width: none !important;
  height: auto;
  margin: 0 auto;
  overflow: visible;
}
.ar-mermaid-diagram svg g,
.ar-mermaid-diagram svg foreignObject,
.ar-mermaid-diagram svg .label,
.ar-mermaid-diagram svg .nodeLabel,
.ar-mermaid-diagram svg .edgeLabel,
.ar-mermaid-diagram svg .cluster-label {
  overflow: visible !important;
}

.ar-mermaid-diagram svg text,
.ar-mermaid-diagram svg tspan,
.ar-mermaid-diagram svg .label,
.ar-mermaid-diagram svg .nodeLabel,
.ar-mermaid-diagram svg .nodeLabel p,
.ar-mermaid-diagram svg .nodeLabel span,
.ar-mermaid-diagram svg .edgeLabel,
.ar-mermaid-diagram svg .edgeLabel p,
.ar-mermaid-diagram svg .edgeLabel span,
.ar-mermaid-diagram svg .edgeLabel text,
.ar-mermaid-diagram svg .messageText,
.ar-mermaid-diagram svg .loopText,
.ar-mermaid-diagram svg .labelText,
.ar-mermaid-diagram svg .stateLabel,
.ar-mermaid-diagram svg .state-title,
.ar-mermaid-diagram svg .transition text,
.ar-mermaid-diagram svg .classText,
.ar-mermaid-diagram svg .pieTitleText,
.ar-mermaid-diagram svg .legend text,
.ar-mermaid-diagram svg foreignObject,
.ar-mermaid-diagram svg foreignObject * {
  fill: #e4e4e7 !important;
  color: #e4e4e7 !important;
  line-height: 1.25 !important;
}
.ar-mermaid-diagram svg .node rect,
.ar-mermaid-diagram svg .node polygon,
.ar-mermaid-diagram svg .node circle,
.ar-mermaid-diagram svg .node ellipse,
.ar-mermaid-diagram svg .node path,
.ar-mermaid-diagram svg .state,
.ar-mermaid-diagram svg .stateGroup,
.ar-mermaid-diagram svg .classBox,
.ar-mermaid-diagram svg .actor {
  fill: #27272a !important;
  stroke: #52525b !important;
}
.ar-mermaid-diagram svg text.actor,
.ar-mermaid-diagram svg tspan.actor,
.ar-mermaid-diagram svg .actor > text,
.ar-mermaid-diagram svg .actor tspan {
  fill: #e4e4e7 !important;
  color: #e4e4e7 !important;
}
.ar-mermaid-diagram svg .messageLine0,
.ar-mermaid-diagram svg .messageLine1,
.ar-mermaid-diagram svg .flowchart-link,
.ar-mermaid-diagram svg .edgePath path,
.ar-mermaid-diagram svg path.transition,
.ar-mermaid-diagram svg .transition path,
.ar-mermaid-diagram svg line {
  stroke: #a1a1aa !important;
  fill: none !important;
}
.ar-mermaid-diagram svg marker path,
.ar-mermaid-diagram svg .marker {
  fill: #a1a1aa !important;
  stroke: #a1a1aa !important;
}
.ar-mermaid-diagram svg .edgeLabel rect,
.ar-mermaid-diagram svg .labelBkg {
  fill: #18181b !important;
  opacity: 0.92 !important;
}
.ar-mermaid-diagram svg .noteText {
  fill: #18181b !important;
  color: #18181b !important;
}
.ar-mermaid-diagram svg .note,
.ar-mermaid-diagram svg .note rect {
  fill: #fde68a !important;
  stroke: #f59e0b !important;
}
.ar-mermaid::-webkit-scrollbar { display: none; }
.ar-mermaid-source {
  display: none;
}

.ar-mermaid[data-ar-mermaid-state="error"] .ar-mermaid-source,
.ar-mermaid[data-ar-mermaid-state="pending"] .ar-mermaid-source,
.ar-mermaid[data-ar-mermaid-state="rendering"] .ar-mermaid-source {
  display: block;
  margin: 0;
  white-space: pre-wrap;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--ar-text-2);
}
.ar-mermaid[data-ar-mermaid-state="error"] .ar-mermaid-diagram,
.ar-mermaid[data-ar-mermaid-state="pending"] .ar-mermaid-diagram,
.ar-mermaid[data-ar-mermaid-state="rendering"] .ar-mermaid-diagram {
  display: none;
}
.ar-inline-code {
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  background: var(--ar-inline-code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.875em;
}

/* ── Syntax colors ── */
.ar-kw { color: var(--ar-syn-kw); }
.ar-str { color: var(--ar-syn-str); }
.ar-num { color: var(--ar-syn-num); }
.ar-cmt { color: var(--ar-syn-cmt); font-style: italic; }
.ar-fn { color: var(--ar-syn-fn); }

/* ── Lists ── */
.ar-ul, .ar-ol { padding-left: 1.5em; margin: 0.75em 0; }
.ar-li { margin: 0.3em 0; }
.ar-li::marker { color: var(--ar-text-3); }
.ar-task {
  list-style: none;
  margin-left: -1.5em;
  padding-left: 0;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: start;
  column-gap: 8px;
  row-gap: 0.35em;
}
.ar-task > .ar-checkbox {
  grid-column-start: 1;
  grid-column-end: 2;
  grid-row: 1;
}
.ar-task > .ar-task-content,
.ar-task > .ar-p {
  grid-column-start: 2;
  grid-column-end: 3;
  min-width: 0;
  margin-top: 0;
  margin-bottom: 0;
}
.ar-task > .ar-ul,
.ar-task > .ar-ol {
  grid-column-start: 2;
  grid-column-end: 3;
  min-width: 0;
  margin-top: 0;
  margin-bottom: 0.35em;
}
.ar-checkbox {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; min-width: 16px;
  color: var(--col-primary, #f4f4f5);
  margin-top: 3px;
  opacity: var(--opacity-inactive, 0.55);
  transition: opacity .15s ease;
}
.ar-checkbox.ar-checked { opacity: 1; }
.ar-checkbox-icon {
  width: 16px;
  height: 16px;
  display: block;
  flex: 0 0 16px;
}
.ar-checkbox-icon path {
  fill: currentColor;
}

/* ── Blockquote ── */
.ar-bq {
  margin: 0.75em 0;
  padding: 0.5em 1em;
  border-left: 3px solid var(--ar-bq-border);
  background: var(--ar-bq-bg);
  color: var(--ar-text-2);
  border-radius: 0 6px 6px 0;
}

/* ── HR ── */
.ar-hr { border: none; border-top: 1px solid var(--ar-hr); margin: 2em 0; }

/* ── Table ── */
.ar-table-scroll {
  width: 0; min-width: 100%; overflow-x: auto; margin: 1em 0;
}
.ar-table {
  width: max-content; min-width: 100%; border-collapse: collapse;
  font-size: 14px;
  table-layout: auto;
}
.ar-table th, .ar-table td {
  padding: 8px 12px; text-align: left;
  border: 1px solid var(--ar-table-border);
}
.ar-table th {
  background: var(--ar-table-header-bg); font-weight: 600;
  white-space: nowrap;
}
.ar-table tr:nth-child(even) td { background: var(--ar-table-stripe); }

/* ── Image ── */
.ar-img { max-width: 100%; border-radius: 8px; margin: 0.5em 0; }

/* ── Streaming indicator ── */
@keyframes ar-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.ar-streaming-dot::after {
  content: '●';
  color: var(--ar-accent);
  font-size: 10px;
  animation: ar-pulse 1.2s ease-in-out infinite;
  margin-left: 4px;
}
`

  // ── Style injection ──────────────────────────────────────────────

  let styleInjected = false

  function injectStyles() {
    if (styleInjected) return
    const style = document.createElement('style')
    style.id = 'agentic-render-styles'
    style.textContent = BASE_CSS
    document.head.appendChild(style)
    styleInjected = true
  }

  // ── Public API ───────────────────────────────────────────────────

  function create(target, options = {}) {
    injectStyles()

    const el = typeof target === 'string' ? document.querySelector(target) : target
    if (!el) throw new Error(`agentic-render: target "${target}" not found`)

    const theme = options.theme === 'light' ? THEME_LIGHT : THEME_DARK
    const customVars = options.vars || {}
    const allVars = { ...theme, ...customVars }

    // Create root
    const root = document.createElement('div')
    root.className = `ar-root ${options.className || ''}`
    for (const [k, v] of Object.entries(allVars)) {
      root.style.setProperty(k, v)
    }
    el.appendChild(root)

    let content = ''
    let rafId = null

    function render() {
      root.innerHTML = parseMarkdown(content, options)
      rafId = null
    }

    function scheduleRender() {
      if (rafId) return
      rafId = requestAnimationFrame(render)
    }

    return {
      /** Append streaming text */
      append(text) {
        content += text
        scheduleRender()
      },

      /** Replace all content */
      set(text) {
        content = text
        scheduleRender()
      },

      /** Get current raw markdown */
      getContent() {
        return content
      },

      /** Update theme vars at runtime */
      setVars(vars) {
        for (const [k, v] of Object.entries(vars)) {
          root.style.setProperty(k, v)
        }
      },

      /** Set theme */
      setTheme(name) {
        const t = name === 'light' ? THEME_LIGHT : THEME_DARK
        for (const [k, v] of Object.entries(t)) {
          root.style.setProperty(k, v)
        }
      },

      /** Get the root DOM element */
      get element() {
        return root
      },

      /** Cleanup */
      destroy() {
        if (rafId) cancelAnimationFrame(rafId)
        root.remove()
      }
    }
  }

  /**
   * One-shot render — returns HTML string
   */
  function render(markdown, options = {}) {
    return parseMarkdown(markdown, options)
  }

  function selectionIntersectsRoot(selection, root) {
    if (!selection || !root || selection.rangeCount <= 0) return false
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i)
      if (typeof range?.intersectsNode === 'function' && range.intersectsNode(root)) return true
      if (root.contains?.(range?.startContainer) || root.contains?.(range?.endContainer)) return true
      const ancestor = range?.commonAncestorContainer
      if (!ancestor) continue
      const node = ancestor.nodeType === 1 ? ancestor : ancestor.parentElement || ancestor.parentNode || ancestor
      if (node && root.contains?.(node)) return true
    }
    return false
  }

  function closestSourceNode(node, root) {
    const el = node?.nodeType === 1 ? node : node?.parentElement || node?.parentNode
    const sourceNode = el?.closest?.('[data-ar-source-start]')
    return sourceNode && root?.contains?.(sourceNode) ? sourceNode : null
  }

  function sourceRangeForNode(node, root) {
    const sourceNode = closestSourceNode(node, root)
    const start = Number(sourceNode?.getAttribute?.('data-ar-source-start'))
    const end = Number(sourceNode?.getAttribute?.('data-ar-source-end') ?? start)
    if (!Number.isInteger(start) || start < 0) return null
    return {
      start,
      end: Number.isInteger(end) && end >= start ? end : start,
    }
  }

  function sourceRangeFromElement(sourceNode) {
    const start = Number(sourceNode?.getAttribute?.('data-ar-source-start'))
    const end = Number(sourceNode?.getAttribute?.('data-ar-source-end') ?? start)
    if (!Number.isInteger(start) || start < 0) return null
    return {
      start,
      end: Number.isInteger(end) && end >= start ? end : start,
    }
  }

  function rangeIntersectsNode(range, node) {
    if (!range || !node) return false
    if (typeof range.intersectsNode === 'function') return range.intersectsNode(node)
    return node.contains?.(range.startContainer) || node.contains?.(range.endContainer)
  }

  function pushUniqueRange(ranges, sourceRange) {
    if (!sourceRange) return
    if (!ranges.some(range => range.start === sourceRange.start && range.end === sourceRange.end)) {
      ranges.push(sourceRange)
    }
  }

  function markdownFromRanges(markdown, ranges) {
    const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n')
    return ranges
      .map(range => lines.slice(range.start, range.end + 1).join('\n').trim())
      .filter(Boolean)
      .join('\n\n')
      .trim()
  }

  function selectionMarkdown(selection, markdown, options = {}) {
    const root = options.root || options.element || null
    if (!selectionIntersectsRoot(selection, root)) return ''
    const ranges = []
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i)
      for (const sourceNode of root?.querySelectorAll?.('[data-ar-source-start]') || []) {
        if (rangeIntersectsNode(range, sourceNode)) {
          pushUniqueRange(ranges, sourceRangeFromElement(sourceNode))
        }
      }
      for (const node of [range?.startContainer, range?.endContainer, range?.commonAncestorContainer]) {
        pushUniqueRange(ranges, sourceRangeForNode(node, root))
      }
    }
    ranges.sort((a, b) => a.start - b.start || a.end - b.end)
    return markdownFromRanges(markdown, ranges)
  }

  /**
   * Get CSS for embedding (no <style> injection needed)
   */
  function getCSS(theme = 'dark') {
    const vars = theme === 'light' ? THEME_LIGHT : THEME_DARK
    const varBlock = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n')
    return `.ar-root {\n${varBlock}\n}\n${BASE_CSS}`
  }

export { create, render, selectionMarkdown, getCSS, THEME_DARK, THEME_LIGHT }
