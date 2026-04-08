# Design: Create ARCHITECTURE.md

## File
`ARCHITECTURE.md` (project root)

## Content outline
1. **Overview** — what agentic-filesystem is
2. **StorageBackend interface** — all methods with signatures from `src/types.ts`
3. **Backend implementations**
   - `AgenticStoreBackend` — in-memory, browser/Node
   - `OPFSBackend` — Origin Private File System, browser only
   - `NodeFsBackend` — Node.js fs, server/Electron
4. **Agent tool layer** — `src/shell-tools.ts`, MCP-compatible tools wrapping the filesystem
5. **Runtime auto-selection** — `createBackend()` / `createAutoBackend()` logic in `src/filesystem.ts`

## No code changes required
This task is documentation only. Read `src/types.ts`, `src/filesystem.ts`, `src/shell-tools.ts`, and each backend to extract accurate interface details.

## Test Cases
- File exists at `ARCHITECTURE.md`
- Contains sections: StorageBackend, backends, agent tools, auto-selection
