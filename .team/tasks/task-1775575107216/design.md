# Design — Sync PRD.md with actual implementation

## File to modify
- `PRD.md`

## Required changes

### code_exec section
- Must mention `quickjs-emscripten` sandbox and `browser-compatible`
- Must mention Python support via `Pyodide` (browser) or `python3` subprocess (Node)

### shell_exec tool
- Must be listed in Tools section with description

### AgenticResult shape
- Must include `shellResults?: ShellResult[]` field

## Approach
Read PRD.md, check each requirement, add/update only what is missing.

## Test cases (maps to DBB)
- DBB-007: `quickjs` and `browser` in code_exec section
- DBB-008: `shell_exec` present in PRD
- DBB-009: `Python` or `Pyodide` present in PRD
- DBB-010: `shellResults` in AgenticResult section
