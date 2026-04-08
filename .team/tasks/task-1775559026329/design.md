# Task Design: Align PRD code_exec sandbox spec

## File to Modify
- `PRD.md`

## Change

Find the `code_exec` tool entry in PRD.md and update the sandbox description from AsyncFunction eval to quickjs-emscripten.

Current (approximate): "executes JavaScript via AsyncFunction eval"
Updated: "executes JavaScript in an isolated quickjs-emscripten sandbox"

## Logic
- Implementation in `src/tools/code.ts` uses `newAsyncContext` / `getQuickJS` from `quickjs-emscripten`
- PRD must match implementation, not the other way around (implementation is correct per m7 upgrade)
- No code changes needed — docs only

## Edge Cases
- If PRD also mentions Python/Pyodide support (added in m9), keep that — only update the sandbox mechanism description
- Do not change any other PRD sections

## Test Cases
- `pnpm test` passes (no code change, just docs)
- PRD.md grep for "AsyncFunction" returns no results after change
