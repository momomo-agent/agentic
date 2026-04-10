# M100: Runtime Safety — Fix Missing Adapter + Dead Code Cleanup

## Goal
Fix the one remaining "missing/major" architecture gap that could cause a runtime error.

## Scope
- **P0**: `runtime/tts.js` ADAPTERS map references `adapters/voice/kokoro.js` but the file does not exist. Either create the adapter or remove the dangling reference.
- **P1**: Remove dead code `adapters/embed.js` (throws 'not implemented', documented dead code still shipping).
- **P2**: Add voice adapter API signatures to ARCHITECTURE.md (architect task).

## Acceptance Criteria
- No runtime errors when kokoro provider is selected (either adapter exists or reference is removed)
- `adapters/embed.js` removed along with any imports/references
- Voice adapter API signatures documented in ARCHITECTURE.md
- Architecture gap scanner no longer reports "missing" status for kokoro adapter

## Context
All scores have reached the goal (Vision 91%, PRD 90%, Architecture 95%, DBB 90%). This milestone addresses the only remaining "missing/major" gap to prevent runtime failures and potentially push architecture match higher.
