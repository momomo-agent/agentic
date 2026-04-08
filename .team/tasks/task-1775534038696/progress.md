# shell_exec tool

## Progress

Implemented shell_exec tool:
- Created `src/tools/shell.ts` with `executeShell()` using `agentic-shell`
- Added `ShellResult` interface and `shell` to `ToolName` in `src/types.ts`
- Added `shellResults` to `AgenticResult` in `src/types.ts`
- Updated `src/ask.ts`: shell tool wiring, `allShellResults` accumulator, return value
- Added `agentic-shell: link:../agentic-shell` to package.json

Note: `AgenticShell.exec()` returns `Promise<string>` (stdout only), adapted ShellResult accordingly.

All 39 tests pass.
