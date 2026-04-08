# Milestone 20: Browser Compatibility & Zero-Config Filesystem

## Goals
Address remaining vision gaps around browser-first compatibility and zero-config promise.

## Scope
1. Fix `shell_exec` browser incompatibility — gate Node.js child_process behind environment detection so the tool is safely excluded in browser contexts
2. Provide a default in-memory `AgenticFileSystem` so users don't need to manually pass one (zero-config promise)
3. Document Pyodide CDN dependency limitation and provide guidance for offline/CSP-restricted environments

## Acceptance Criteria
- `shell_exec` does not import or invoke `child_process` in browser environments
- `ask()` works without passing `filesystem` config (default in-memory FS used automatically)
- README documents Pyodide CDN requirement and workaround
