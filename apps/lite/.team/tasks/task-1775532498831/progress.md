# Upgrade code_exec to quickjs-emscripten sandbox

## Progress

Implementation already complete. Verified all 8 tests pass (`pnpm test test/code-tool.test.ts`).
- Uses `quickjs-emscripten` (no `new Function`/`eval`)
- Sync + async paths, console injection, error handling, memory disposal all correct.
