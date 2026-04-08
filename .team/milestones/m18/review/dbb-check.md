# DBB Check — M18

**Match: 100/100** | 2026-04-08T12:00:00Z

## Results

| Criterion | Status |
|-----------|--------|
| DBB-001: README contains 'npm install agentic-lite' | pass |
| DBB-002: README quick start section with ask() example | pass |
| DBB-003: README full API reference (ask, AgenticConfig, AgenticResult) | pass |
| DBB-004: README lists all 4 tools with descriptions | pass |
| DBB-005: AgenticResult.usage is required (no ?) | pass |
| DBB-006: PRD documents shell_exec | pass |
| DBB-007: PRD documents Python code_exec | pass |
| DBB-008: PRD documents quickjs sandbox | pass |
| DBB-009: PRD documents shellResults in AgenticResult | pass |
| DBB-010: Global DBB README install string | pass |

## Evidence

- `README.md:7` — `npm install agentic-lite`
- `README.md:10-22` — Quick Start with `ask()` example
- `README.md:24-83` — API reference for ask(), AgenticConfig, AgenticResult
- `README.md:85-172` — all 4 tools (code_exec, shell_exec, file, search) documented
- `types.ts:52` — `usage: { input: number; output: number }` (required)
- `PRD.md:13` — shell_exec documented
- `PRD.md:11` — Python support documented
- `PRD.md:11` — quickjs-emscripten sandbox documented
- `PRD.md:35` — shellResults in AgenticResult
