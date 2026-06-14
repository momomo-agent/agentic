const EDITOR_CSS = `
.ar-editor {
  position: relative;
  min-height: 1.75em;
}

.ar-editor-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.75;
  color: var(--ar-text);
}

.ar-editor-content,
.ar-editor-content .milkdown,
.ar-editor-content .editor,
.ar-editor-content .ProseMirror {
  min-height: inherit;
}

.ar-editor-content .editor,
.ar-editor-content .ProseMirror {
  outline: none;
  color: var(--ar-text);
  caret-color: var(--ar-accent);
  white-space: pre-wrap;
}

.ar-editor-content .editor[contenteditable="false"],
.ar-editor-content .ProseMirror[contenteditable="false"] {
  cursor: default;
}

.ar-editor-content .editor:focus,
.ar-editor-content .ProseMirror:focus {
  outline: none;
}

.ar-editor-content .editor::selection,
.ar-editor-content .ProseMirror::selection,
.ar-editor-content .editor *::selection,
.ar-editor-content .ProseMirror *::selection {
  background: color-mix(in srgb, var(--ar-accent) 32%, transparent);
}

.ar-editor-content .editor p.is-editor-empty:first-child::before,
.ar-editor-content .ProseMirror p.is-editor-empty:first-child::before,
.ar-editor-content .editor:empty::before,
.ar-editor-content .ProseMirror:empty::before {
  content: attr(data-placeholder);
  color: var(--ar-text-3);
  pointer-events: none;
  height: 0;
  float: left;
}

.ar-editor-content h1,
.ar-editor-content h2,
.ar-editor-content h3,
.ar-editor-content h4,
.ar-editor-content h5,
.ar-editor-content h6 {
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 1.5em 0 0.6em;
  color: var(--ar-text);
}

.ar-editor-content h1:first-child,
.ar-editor-content h2:first-child,
.ar-editor-content h3:first-child,
.ar-editor-content h4:first-child,
.ar-editor-content h5:first-child,
.ar-editor-content h6:first-child {
  margin-top: 0;
}

.ar-editor-content h1 { font-size: 1.65em; line-height: 1.2; }
.ar-editor-content h2 { font-size: 1.35em; line-height: 1.25; }
.ar-editor-content h3 { font-size: 1.15em; line-height: 1.3; }
.ar-editor-content h4,
.ar-editor-content h5,
.ar-editor-content h6 { font-size: 1em; line-height: 1.3; }

.ar-editor-content p {
  margin: 0.75em 0;
}

.ar-editor-content p:first-child {
  margin-top: 0;
}

.ar-editor-content strong {
  font-weight: 600;
  color: var(--ar-text);
}

.ar-editor-content em {
  font-style: italic;
}

.ar-editor-content del,
.ar-editor-content s {
  text-decoration: line-through;
  color: var(--ar-text-3);
}

.ar-editor-content a {
  color: var(--ar-link);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
}

.ar-editor-content a:hover {
  border-bottom-color: var(--ar-link);
}

.ar-editor-content code {
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  background: var(--ar-inline-code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.875em;
}

.ar-editor-content pre {
  margin: 1em 0;
  padding: 16px 18px;
  border: 1px solid var(--ar-border);
  border-radius: 8px;
  background: var(--ar-code-bg);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  font-size: 13.5px;
  line-height: 1.6;
}

.ar-editor-content pre::-webkit-scrollbar {
  display: none;
}

.ar-editor-content pre code {
  display: block;
  padding: 0;
  border-radius: 0;
  background: none;
  font-size: inherit;
  line-height: inherit;
  white-space: pre;
}

.ar-editor-content ul,
.ar-editor-content ol {
  padding-left: 1.5em;
  margin: 0.75em 0;
}

.ar-editor-content li {
  margin: 0.3em 0;
}

.ar-editor-content li::marker {
  color: var(--ar-text-3);
}

.ar-editor-content li[data-checked],
.ar-editor-content li[aria-checked] {
  list-style: none;
  margin-left: -1.5em;
}

.ar-editor-content blockquote {
  margin: 0.75em 0;
  padding: 0.5em 1em;
  border-left: 3px solid var(--ar-bq-border);
  background: var(--ar-bq-bg);
  color: var(--ar-text-2);
  border-radius: 0 6px 6px 0;
}

.ar-editor-content hr {
  border: none;
  border-top: 1px solid var(--ar-hr);
  margin: 2em 0;
}

.ar-editor-content table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 14px;
  table-layout: auto;
  overflow: visible;
}

.ar-editor-content .tableWrapper {
  width: 0;
  min-width: 100%;
  overflow-x: auto;
  margin: 1em 0;
}

.ar-editor-content .ProseMirror table {
  width: max-content !important;
  min-width: 100% !important;
  table-layout: auto !important;
  overflow: visible !important;
}

.ar-editor-content .ProseMirror .tableWrapper {
  width: 0 !important;
  min-width: 100% !important;
  overflow-x: auto !important;
}

.ar-editor-content th,
.ar-editor-content td {
  padding: 8px 12px;
  text-align: left;
  border: 1px solid var(--ar-table-border);
}

.ar-editor-content th {
  background: var(--ar-table-header-bg);
  font-weight: 600;
  white-space: nowrap;
}

.ar-editor-content tr:nth-child(even) td {
  background: var(--ar-table-stripe);
}

.ar-editor-content img {
  max-width: 100%;
  border-radius: 8px;
  margin: 0.5em 0;
}

/* Prism syntax highlighting (aligned with chat flow colors) */
.ar-editor-content .token.keyword,
.ar-editor-content .token.tag,
.ar-editor-content .token.attr-name { color: #c792ea; }
.ar-editor-content .token.string,
.ar-editor-content .token.attr-value { color: #c3e88d; }
.ar-editor-content .token.number,
.ar-editor-content .token.boolean { color: #f78c6c; }
.ar-editor-content .token.comment,
.ar-editor-content .token.prolog,
.ar-editor-content .token.doctype { color: #546e7a; font-style: italic; }
.ar-editor-content .token.function,
.ar-editor-content .token.class-name { color: #82aaff; }
.ar-editor-content .token.operator { color: #89ddff; }
.ar-editor-content .token.punctuation { color: #babed8; }
.ar-editor-content .token.property { color: #f07178; }
.ar-editor-content .token.selector { color: #c3e88d; }
.ar-editor-content .token.variable { color: #f07178; }
.ar-editor-content .token.builtin { color: #ffcb6b; }
.ar-editor-content .token.regex { color: #89ddff; }
`

function getEditorCSS() {
  return EDITOR_CSS
}

export { EDITOR_CSS, getEditorCSS }
