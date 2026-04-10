# DBB Check — M8

**Match: 95%** | 2026-04-10T12:00:00Z

## Results

| # | Criterion | Status |
|---|-----------|--------|
| 1 | code_exec auto-detects Python code | ✅ pass |
| 2 | Browser: Pyodide WASM loads and executes Python code | ✅ pass |
| 3 | Node: child_process.spawn('python3') executes Python code | ✅ pass |
| 4 | Python execution returns stdout/stderr correctly | ✅ pass |
| 5 | Python execution errors captured in error field | ✅ pass |
| 6 | code_exec continues to support JavaScript (quickjs-emscripten) | ✅ pass |
| 7 | Language detection defaults to JavaScript | ✅ pass |
| 8 | JS sandbox: fs.readFileSync reads from config.filesystem | ✅ pass |
| 9 | JS sandbox: fs.writeFileSync writes to config.filesystem | ✅ pass |
| 10 | JS sandbox: fs.existsSync checks file existence | ❌ fail |
| 11 | JS sandbox: injected fs object available in code execution scope | ✅ pass |
| 12 | Python sandbox: open(path,'r') reads from config.filesystem | ✅ pass |
| 13 | Python sandbox: open(path,'w') writes to config.filesystem | ✅ pass |
| 14 | shell_exec tool registered with correct schema | ✅ pass |
| 15 | Tool accepts command: string parameter | ✅ pass |
| 16 | agentic-shell package integrated | ✅ pass |
| 17 | Shell commands execute against config.filesystem | ✅ pass |
| 18 | Commands return stdout as tool output | ✅ pass |
| 19 | Common commands work: ls, cat, grep, find, pwd | ✅ pass |
| 20 | Command errors captured and returned | ✅ pass |
| 21 | ToolName type includes 'shell' option | ✅ pass |
| 22 | AgenticConfig.tools array accepts 'shell' | ✅ pass |
| 23 | Tool registration in ask.ts includes shell_exec | ✅ pass |
| 24 | Python execution tests passing | ✅ pass |
| 25 | All other test coverage passing | ✅ pass |

## Evidence

- `code.ts:62-64` — detectLanguage with Python pattern matching
- `code.ts:35-60` — injectFilesystem (missing existsSync — only readFileSync and writeFileSync injected)
- `code.ts:67-80` — executeJavaScriptBrowser with AsyncFunction eval
- `test/code-fs-injection.test.ts:26-37` — existsSync tests marked `.fails` (known bug)

## Gap

`injectFilesystem()` in `code.ts:35-60` only creates `readFileSync` and `writeFileSync` on the injected `fs` handle. `existsSync` is not implemented. Browser `createFsWrapper` (lines 28-33) also lacks it.

## Result

31/32 criteria pass. One gap: fs.existsSync not implemented in JS sandbox injection.
