const EDITOR_CSS = `
.ar-editor {
  position: relative;
  min-height: 1.75em;
}

.ar-editor-content,
.ar-editor-content .milkdown,
.ar-editor-content .editor,
.ar-editor-content .ProseMirror {
  min-height: inherit;
}

.ar-editor-content .editor,
.ar-editor-content .ProseMirror {
  position: relative;
  outline: none;
  color: inherit;
  caret-color: var(--ar-accent);
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  white-space: break-spaces;
  -webkit-font-variant-ligatures: none;
  font-variant-ligatures: none;
  font-feature-settings: "liga" 0;
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

.ar-editor-content .editor .ar-p.is-editor-empty:first-child::before,
.ar-editor-content .ProseMirror .ar-p.is-editor-empty:first-child::before,
.ar-editor-content .editor:empty::before,
.ar-editor-content .ProseMirror:empty::before {
  content: attr(data-placeholder);
  color: var(--ar-text-3);
  pointer-events: none;
  height: 0;
  float: left;
}

.ar-editor-content .ProseMirror pre.ar-pre,
.ar-editor-content .ProseMirror pre.ar-pre code.ar-code {
  white-space: pre;
}

.ar-editor-content .ar-li > .ar-p,
.ar-editor-content .ar-table th > .ar-p,
.ar-editor-content .ar-table td > .ar-p {
  margin: 0;
}

.ar-editor-content .ar-table th,
.ar-editor-content .ar-table td {
  vertical-align: top;
}

.ar-editor-content .ar-table th[data-align],
.ar-editor-content .ar-table td[data-align] {
  text-align: inherit;
}

.ar-editor-content .ar-table th[data-align="left"],
.ar-editor-content .ar-table td[data-align="left"] {
  text-align: left;
}

.ar-editor-content .ar-table th[data-align="center"],
.ar-editor-content .ar-table td[data-align="center"] {
  text-align: center;
}

.ar-editor-content .ar-table th[data-align="right"],
.ar-editor-content .ar-table td[data-align="right"] {
  text-align: right;
}

.ar-editor-content .ar-task > .ar-p {
  flex: 1 1 auto;
  min-width: 0;
}

.ar-editor-content .ar-bq > :first-child {
  margin-top: 0;
}

.ar-editor-content .ar-bq > :last-child {
  margin-bottom: 0;
}

.ar-editor-content .ProseMirror-hideselection *::selection {
  background: transparent;
}

.ar-editor-content .ProseMirror-hideselection *::-moz-selection {
  background: transparent;
}

.ar-editor-content .ProseMirror-hideselection {
  caret-color: transparent;
}

.ar-editor-content .ProseMirror [draggable][contenteditable="false"] {
  user-select: text;
}

.ar-editor-content .ProseMirror li {
  position: relative;
}

.ar-editor-content .ProseMirror-selectednode {
  outline: 2px solid color-mix(in srgb, var(--ar-accent) 70%, white);
}

.ar-editor-content li.ProseMirror-selectednode {
  outline: none;
}

.ar-editor-content li.ProseMirror-selectednode::after {
  content: "";
  position: absolute;
  left: -32px;
  right: -2px;
  top: -2px;
  bottom: -2px;
  border: 2px solid color-mix(in srgb, var(--ar-accent) 70%, white);
  pointer-events: none;
}

.ar-editor-content .ProseMirror .selectedCell::after {
  z-index: 2;
  position: absolute;
  content: "";
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--ar-accent) 20%, transparent);
  pointer-events: none;
}

.ar-editor-content .ProseMirror .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  z-index: 20;
  background-color: color-mix(in srgb, var(--ar-accent) 70%, white);
  pointer-events: none;
}

.ar-editor-content .ProseMirror.resize-cursor {
  cursor: ew-resize;
  cursor: col-resize;
}

.ar-editor-content .ProseMirror-gapcursor {
  display: none;
  pointer-events: none;
  position: absolute;
}

.ar-editor-content .ProseMirror-gapcursor::after {
  content: "";
  display: block;
  position: absolute;
  top: -2px;
  width: 20px;
  border-top: 1px solid var(--ar-accent);
  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
}

.ar-editor-content .ProseMirror-focused .ProseMirror-gapcursor {
  display: block;
}

@keyframes ProseMirror-cursor-blink {
  to {
    visibility: hidden;
  }
}

.ar-editor-content img.ProseMirror-separator {
  display: inline !important;
  border: none !important;
  margin: 0 !important;
}

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
.ar-editor-content .token.operator,
.ar-editor-content .token.regex { color: #89ddff; }
.ar-editor-content .token.punctuation { color: #babed8; }
.ar-editor-content .token.property,
.ar-editor-content .token.variable { color: #f07178; }
.ar-editor-content .token.selector { color: #c3e88d; }
.ar-editor-content .token.builtin { color: #ffcb6b; }
`

function getEditorCSS() {
  return EDITOR_CSS
}

export { EDITOR_CSS, getEditorCSS }
