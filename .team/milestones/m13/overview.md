# m13 — Type Correctness & README API Docs

## Goals
- Fix `AgenticResult.usage` type from optional to required (always returned)
- Fix `systemPrompt` positional param mismatch in ask() signature
- Add `shellResults` field to PRD's AgenticResult documentation
- Expand README with API documentation (usage examples, options, return types)

## Gaps Addressed
- vision: README missing API documentation
- prd: `AgenticResult.usage` typed as optional but always returned
- prd: `AgenticResult` missing `shellResults` field
- architecture: `systemPrompt` positional param spec mismatch

## Acceptance Criteria
- `AgenticResult.usage` is typed as required (not `usage?`)
- `ask()` signature matches architecture spec for `systemPrompt` param
- README includes API reference section with types and examples
- PRD documents `shellResults` in AgenticResult

## Blocked By
- None (CR-1775560282316 covers separate PRD items; these are independent)
