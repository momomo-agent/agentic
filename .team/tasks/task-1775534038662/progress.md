# code_exec 内注入 filesystem API

## Progress

Implemented filesystem injection in `src/tools/code.ts`:
- Added async `injectFilesystem(vm, filesystem?)` using `newAsyncifiedFunction`
- JS execution uses `newAsyncContext` when filesystem is present
- Python (browser): injects via `pyodide.globals` + overrides `open()`
- Python (Node): prepends preamble overriding `open()`, captures writes via stdout markers
- Updated `executeCode` to accept optional `filesystem` parameter
- Updated `ask.ts` to pass `config.filesystem` to `executeCode`

All 39 tests pass.
