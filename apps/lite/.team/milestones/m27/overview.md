# Milestone 27: agentic-core Extraction

## Goal
Close the critical vision gap (82% → ≥90%): Extract agent loop, provider abstraction, and tool schema into a separate `agentic-core` package, making `ask.ts` a thin (<100 line) integration layer.

## Scope
- Create `packages/agentic-core/` with agent loop, provider abstraction, types
- Refactor `src/ask.ts` to import from agentic-core (thin integration layer)
- Update ARCHITECTURE.md to reflect new module structure
- All 107 tests must pass

## Acceptance Criteria
- `ask.ts` is < 100 lines
- agentic-core handles: LLM loop, provider creation, tool schema, message management
- agentic-lite imports agentic-core and adds tool implementations + system prompt
- All existing tests pass (107/107)
- Vision gap closes to ≥90%
