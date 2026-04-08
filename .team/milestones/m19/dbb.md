# M19 DBB - README API Docs & PRD Final Sync

## DBB-001: README installation section
- Requirement: README has installation + quick start
- Given: README.md is read
- Expect: contains `npm install agentic-lite`
- Verify: string `npm install agentic-lite` present in README.md

## DBB-002: README quick start example
- Requirement: README has installation + quick start
- Given: README.md is read
- Expect: contains a runnable `ask()` usage example with provider and apiKey
- Verify: code block with `ask(` and `provider` visible in README.md

## DBB-003: README API reference — ask()
- Requirement: README has full API reference
- Given: README.md is read
- Expect: documents `ask(prompt, config)` signature, parameters, and return type `Promise<AgenticResult>`
- Verify: `ask`, `prompt`, `config`, `AgenticResult` all appear in README.md

## DBB-004: README AgenticConfig interface
- Requirement: README has full API reference
- Given: README.md is read
- Expect: documents all AgenticConfig fields: provider, apiKey, model, baseUrl, customProvider, systemPrompt, tools, filesystem, toolConfig
- Verify: each field name appears in README.md

## DBB-005: README AgenticResult interface
- Requirement: README has full API reference
- Given: README.md is read
- Expect: documents AgenticResult shape including answer, sources, images, codeResults, files, shellResults, toolCalls, usage
- Verify: each field name appears in README.md

## DBB-006: README tool descriptions — all 4 tools
- Requirement: README has tool descriptions
- Given: README.md is read
- Expect: describes code_exec, shell_exec, file_read/file_write, and search tools
- Verify: `code_exec`, `shell_exec`, `file_read`, `file_write`, `search` all appear in README.md

## DBB-007: PRD describes code_exec sandbox accurately
- Requirement: PRD.md accurately describes all 4 tools
- Given: PRD.md is read
- Expect: code_exec entry mentions quickjs-emscripten sandbox and browser-compatible
- Verify: `quickjs` and `browser` appear in the code_exec section of PRD.md

## DBB-008: PRD describes shell_exec tool
- Requirement: PRD.md accurately describes all 4 tools
- Given: PRD.md is read
- Expect: shell_exec tool is listed with description
- Verify: `shell_exec` appears in PRD.md

## DBB-009: PRD describes Python support
- Requirement: PRD.md accurately describes all 4 tools
- Given: PRD.md is read
- Expect: Python execution support mentioned (Pyodide or python3)
- Verify: `Python` or `Pyodide` appears in PRD.md

## DBB-010: PRD documents shellResults in AgenticResult
- Requirement: PRD.md accurately describes AgenticResult shape
- Given: PRD.md is read
- Expect: AgenticResult shape includes `shellResults` field
- Verify: `shellResults` appears in PRD.md AgenticResult section

## DBB-011: Global criteria — npm install string
- Requirement: EXPECTED_DBB global criterion
- Given: README.md is read
- Expect: contains exactly `npm install agentic-lite`
- Verify: string match present
