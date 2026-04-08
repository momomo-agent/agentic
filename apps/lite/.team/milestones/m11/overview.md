# M11: README Expansion & Type Completeness

## Goals
- Expand README.md with full API documentation, usage examples, and tool descriptions
- Fix AgenticResult type: ensure shellResults field is documented/typed consistently

## Scope
- README.md: add API reference, usage examples, all tools documented
- types.ts: verify shellResults is in AgenticResult and matches actual return shape

## Acceptance Criteria
- README.md has: installation, quick start, full ask() API, all tools (code_exec, shell_exec, file_read, file_write, search), provider config options
- AgenticResult.shellResults field is present and typed correctly in types.ts
- Vision match improves from 88% toward 95%+

## Blocked By
- CR cr-1775564589954 (PRD.md updates) — tracked separately, not blocking m11
