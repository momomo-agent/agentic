# DBB Check — M22

**Match: 100/100** | 2026-04-08T12:00:00Z

## Results

| Criterion | Status |
|-----------|--------|
| DBB-001: shell_exec browser stub — no crash | pass |
| DBB-002: shell_exec browser stub — result shape | pass |
| DBB-003: shell_exec Node.js — unaffected | pass |
| DBB-004: Pyodide load failure — graceful error | pass |
| DBB-005: Pyodide load failure — result shape | pass |
| DBB-006: Pyodide success path — unaffected | pass |
| DBB-007: Existing test suite passes | pass |

## Evidence

- `shell.ts:30` — `if (!isNodeEnv()) return { command, output: '', error: 'shell_exec not available in browser', exitCode: 1 }` — graceful browser stub
- `shell.ts:40` — returns `{ command, output, exitCode }` conforming to ShellResult shape
- `shell.ts:33-43` — Node.js path uses `agentic-shell` normally
- `code.ts:54-59` — Pyodide load failure caught: `return { code, output: '', error: 'Pyodide unavailable: ...' }`
- `code.ts:95-97` — Pyodide runtime error captured: `return { code, output: '', error: err.message }`
- `code.ts:92-94` — Pyodide success path returns output normally
- `test/m25-shell-browser-safety.test.ts` — browser safety tests passing
- 107/107 tests passing
