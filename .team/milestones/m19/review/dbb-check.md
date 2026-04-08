# DBB Check — M19

**Match: 100/100** | 2026-04-08T12:00:00Z

## Results

| Criterion | Status |
|-----------|--------|
| DBB-001: README contains 'npm install agentic-lite' | pass |
| DBB-002: README quick start with ask() usage example | pass |
| DBB-003: README API reference — ask(prompt, config) | pass |
| DBB-004: README AgenticConfig — all fields documented | pass |
| DBB-005: README AgenticResult — all fields documented | pass |
| DBB-006: README tool descriptions — all 4 tools | pass |
| DBB-007: PRD describes code_exec sandbox (quickjs, browser) | pass |
| DBB-008: PRD describes shell_exec tool | pass |
| DBB-009: PRD describes Python support | pass |
| DBB-010: PRD documents shellResults in AgenticResult | pass |
| DBB-011: Global criteria — npm install string | pass |

## Evidence

- `README.md:7` — `npm install agentic-lite`
- `README.md:10-22` — Quick Start example
- `README.md:26-34` — `ask(prompt, config)` signature
- `README.md:36-63` — AgenticConfig with all fields (provider, apiKey, model, baseUrl, customProvider, systemPrompt, tools, filesystem, toolConfig)
- `README.md:65-83` — AgenticResult with all fields (answer, sources, images, codeResults, files, shellResults, toolCalls, usage)
- `README.md:85-172` — code_exec, shell_exec, file_read/write, search documented
- `PRD.md:11` — quickjs-emscripten + browser-compatible
- `PRD.md:13` — shell_exec documented
- `PRD.md:11` — Python/Pyodide documented
- `PRD.md:35` — shellResults in AgenticResult
