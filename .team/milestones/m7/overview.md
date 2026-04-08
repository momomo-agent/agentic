# M7: Quality Polish & Interface Hardening

## Goals
Address remaining partial gaps in streaming, type safety, and cross-environment contract validation.

## Scope
- grep streaming: surface fallback indication when readStream unavailable
- grep streaming: add formal TypeScript interface for streaming contract (remove duck-type cast)
- Cross-environment: add fs adapter contract validation at shell initialization

## Acceptance Criteria
- grep streaming fallback logs/returns a warning when falling back to read()
- AgenticFileSystem interface extended with optional readStream typed properly
- Shell constructor validates fs adapter implements required methods
- All existing tests continue to pass

## Tasks
- task-m7-001: grep streaming fallback indication
- task-m7-002: AgenticFileSystem streaming interface type safety
- task-m7-003: fs adapter contract validation at init
