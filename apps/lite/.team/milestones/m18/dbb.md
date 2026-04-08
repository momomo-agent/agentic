# M18 DBB - README Docs & PRD Final Sync

## DBB-001: README installation section
- Requirement: README has installation section
- Given: README.md is read
- Expect: contains `npm install agentic-lite`
- Verify: string search in README.md

## DBB-002: README quick start section
- Requirement: README has quick start
- Given: README.md is read
- Expect: contains a quick start or getting started section with a code example showing `ask()`
- Verify: section heading and code block present in README.md

## DBB-003: README full API reference
- Requirement: README has full API reference
- Given: README.md is read
- Expect: documents `ask(prompt, config)` signature, all `AgenticConfig` fields, and `AgenticResult` fields
- Verify: each PRD-defined field appears in README.md

## DBB-004: README tool list
- Requirement: README documents all tools
- Given: README.md is read
- Expect: all four tools listed — `search`, `code_exec`, `file_read`/`file_write`, `shell_exec`
- Verify: each tool name appears in README.md with a description

## DBB-005: AgenticResult.usage is required
- Requirement: `AgenticResult.usage` typed as required
- Given: the published type for `AgenticResult`
- Expect: `usage` field has no `?` — it is not optional
- Verify: `usage: { input: number; output: number }` (no `?`) is present in the type definition

## DBB-006: PRD documents shell_exec
- Requirement: PRD.md documents shell_exec tool
- Given: PRD.md is read
- Expect: `shell_exec` is listed as a tool with a description
- Verify: string `shell_exec` present in PRD.md tools section

## DBB-007: PRD documents Python code_exec
- Requirement: PRD.md documents Python support in code_exec
- Given: PRD.md is read
- Expect: Python is mentioned as a supported language for `code_exec`
- Verify: string `Python` or `python` present in PRD.md code_exec description

## DBB-008: PRD documents quickjs sandbox
- Requirement: PRD.md documents quickjs sandbox
- Given: PRD.md is read
- Expect: quickjs or quickjs-emscripten mentioned in code_exec description
- Verify: string `quickjs` present in PRD.md

## DBB-009: PRD documents shellResults in AgenticResult
- Requirement: PRD.md documents shellResults field
- Given: PRD.md AgenticResult section is read
- Expect: `shellResults` field listed in AgenticResult type block
- Verify: string `shellResults` present in PRD.md

## DBB-010: Global DBB — README install string
- Requirement: EXPECTED_DBB global criterion
- Given: README.md is read
- Expect: contains exactly `npm install agentic-lite`
- Verify: string match in README.md
