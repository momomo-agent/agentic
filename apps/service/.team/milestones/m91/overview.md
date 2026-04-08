# M91: Architecture Doc Sync + agentic-sense Completion

## Goal
Close remaining architecture gaps by documenting undocumented modules, and ensure agentic-sense wiring is verified end-to-end.

## Scope
- Document tunnel.js, CLI module, HTTPS/middleware, VAD, agentic-embed in ARCHITECTURE.md (via CR)
- Verify agentic-sense wiring is complete and sense.js loads without errors
- Confirm test pass rate holds at >=90% after sense fix

## Acceptance Criteria
- All architecture gaps move from "missing"/"partial" to "implemented"
- `src/runtime/sense.js` loads without import errors
- Test suite passes >=90% (>=591/657)
- No import map '#agentic-sense' references remain in source

## Tasks
- t1: Submit CR to document tunnel, CLI, HTTPS, VAD, embed in ARCHITECTURE.md
- t2: Verify agentic-sense wiring complete + sense.js runtime loads
- t3: Re-run full test suite and confirm >=90% pass rate
