# Milestone 15: ARCHITECTURE.md & Type Correctness

## Goals
- Create ARCHITECTURE.md (P0 — currently missing)
- Fix AgenticResult.usage type (optional → required)
- Fix AgenticResult.images type (string[] | undefined → string[])
- Add shellResults to PRD AgenticResult schema

## Acceptance Criteria
- ARCHITECTURE.md documents modules, interfaces, data flow
- types.ts: usage is required, images is string[]
- PRD.md AgenticResult includes shellResults field
