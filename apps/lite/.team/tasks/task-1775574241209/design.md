# Design: Expand README with API docs and usage examples

## File to modify
- `README.md`

## Current state
README already has: Installation, Quick Start, API Reference, Tools, Examples.
All DBB-required strings appear to be present.

## Algorithm
1. Read README.md
2. Grep for each DBB-required string
3. Add any missing string with minimal content
4. No structural rewrites

## DBB checks
- `npm install agentic-lite` → DBB-001
- `ask(` code example → DBB-002
- All AgenticConfig/AgenticResult fields → DBB-003
- `shell_exec`, `code_exec`, `file_read`, `file_write`, `search` → DBB-004

## Test cases
```
grep 'npm install agentic-lite' README.md
grep 'shell_exec' README.md
grep 'shellResults' README.md
grep 'usage' README.md
```
