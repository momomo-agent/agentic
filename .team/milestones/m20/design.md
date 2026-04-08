# M20 Technical Design: Browser Compatibility & Zero-Config Filesystem

## 1. shell_exec Browser Gate

**File:** `src/tools/shell.ts`

Add an `isBrowser()` helper that checks `typeof window !== 'undefined'`. In `executeShell`, return early with an error if browser is detected — before the dynamic `import('agentic-shell')`. The `shellToolDef` registration in `ask.ts` (`buildToolDefs`) should also skip adding `shell_exec` when in a browser context.

## 2. Default In-Memory Filesystem

**File:** `src/ask.ts`

In `ask()`, if `config.filesystem` is undefined and the `file` or `shell` or `code` tool is enabled, create a default in-memory filesystem via `new AgenticFileSystem({ storage: new MemoryStorage() })` from `agentic-filesystem`. Pass this default instance wherever `config.filesystem` is used. The original `config` object is not mutated — use a local `const fs = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })`.

## 3. README Pyodide Documentation

**File:** `README.md`

Add a `### Browser: Python / Pyodide` subsection under the existing browser/code_exec docs explaining:
- Pyodide is loaded from CDN (`https://cdn.jsdelivr.net/pyodide/...`)
- Offline/CSP workaround: self-host Pyodide and set `pyodideIndexURL` config, or disable Python by not including `code` in tools

## Dependencies

- `agentic-filesystem` already in deps; `MemoryFileSystem` must be exported from it (verify before implementing)
- No new packages required
