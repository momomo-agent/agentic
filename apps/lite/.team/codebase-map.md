# Codebase Map — agentic-lite

Updated: 2026-04-10

## Technology Stack
- Language: TypeScript (ESM, `"type": "module"`)
- Build: tsup
- Test: vitest
- Runtime: Node.js + Browser (dual-target)

## Dependencies
| Package | Version | Role |
|---|---|---|
| agentic-core | workspace:* | Agent loop, LLM providers, tool registry |
| agentic-filesystem | workspace:* | Virtual filesystem (MemoryStorage, browser-safe) |
| agentic-shell | workspace:* | Shell command execution (Node-only) |
| quickjs-emscripten | ^0.29.0 | JS sandbox for code_exec (Node) |
| pyodide | ^0.25.0 | Python sandbox for code_exec (browser) |

## File Tree

```
src/
├── index.ts          (7 lines)   — Public API re-exports
├── ask.ts            (78 lines)  — Integration layer: ask() + askStream()
├── types.ts          (71 lines)  — All shared interfaces
└── tools/
    ├── index.ts      (5 lines)   — Tool barrel exports
    ├── search.ts     (73 lines)  — Web search (Tavily/Serper)
    ├── code.ts       (364 lines) — Code execution (QuickJS + Pyodide)
    ├── file.ts       (51 lines)  — File read/write via AgenticFileSystem
    └── shell.ts      (44 lines)  — Shell exec via agentic-shell
```

## Module Interfaces

### src/index.ts
Re-exports:
- `ask`, `askStream` from `./ask.js`
- Types: `AgenticConfig`, `AgenticResult`, `ToolName`, `Source`, `CodeResult`, `FileResult`, `ShellResult`, `ToolCall`
- `AgenticFileSystem`, `AgenticStoreBackend`, `MemoryStorage` from `agentic-filesystem`

### src/ask.ts
- `ask(prompt: string, config?: AgenticConfig): Promise<AgenticResult>` — synchronous agent call
- `askStream(prompt: string, config?: AgenticConfig): AsyncGenerator<{ type: string; text?: string }>` — streaming agent call
- Internal: `buildTools(config)` — assembles tool array from config
- Imports: `agentic-core` (agenticAsk), `agentic-filesystem` (AgenticFileSystem, MemoryStorage), tool executors

### src/types.ts
- `AgenticConfig` — input config interface
- `AgenticResult` — output result interface
- `ToolName` — `'search' | 'code' | 'file' | 'shell'`
- `Source`, `CodeResult`, `FileResult`, `ShellResult`, `ToolCall` — result sub-types

### src/tools/search.ts
- `searchToolDef: ToolDefinition` — tool schema
- `executeSearch(input, config?): Promise<{ text, sources, images? }>` — Tavily or Serper

### src/tools/code.ts
- `codeToolDef: ToolDefinition` — tool schema
- `executeCode(input, fs?, timeout?): Promise<CodeResult>` — JS (QuickJS/AsyncFunction) or Python (Pyodide/subprocess)
- Internal: `detectLanguage()`, `injectFilesystem()`, `withTimeout()`, browser/Node paths

### src/tools/file.ts
- `fileReadToolDef`, `fileWriteToolDef: ToolDefinition` — tool schemas
- `executeFileRead(input, fs?): Promise<FileResult>`
- `executeFileWrite(input, fs?): Promise<FileResult>`

### src/tools/shell.ts
- `shellToolDef: ToolDefinition` — tool schema
- `isNodeEnv(): boolean` — environment detection
- `executeShell(input, fs?): Promise<ShellResult>`

## Dependency Graph

```
index.ts
  └── ask.ts
        ├── agentic-core (agenticAsk)
        ├── agentic-filesystem (AgenticFileSystem, MemoryStorage)
        ├── tools/code.ts
        │     ├── agentic-core (ToolDefinition type)
        │     ├── agentic-filesystem (AgenticFileSystem type)
        │     ├── quickjs-emscripten (dynamic import, Node)
        │     └── pyodide (dynamic import, browser)
        ├── tools/file.ts
        │     ├── agentic-core (ToolDefinition type)
        │     └── agentic-filesystem (AgenticFileSystem type)
        └── tools/shell.ts
              ├── agentic-core (ToolDefinition type)
              ├── agentic-filesystem (AgenticFileSystem type)
              └── agentic-shell (dynamic import, Node)
```
