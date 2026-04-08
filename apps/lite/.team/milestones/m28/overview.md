# Milestone 28: Streaming & Timeout Enforcement

## Goal
Close remaining vision gaps to push Vision match ≥90%: implement streaming support in agentic-core and enforce the code execution timeout.

## Context
The agentic-core extraction (m27) is functionally complete:
- `ask.ts` is 99 lines, imports from `agentic-core`
- Agent loop, provider layer, tool schema all in `packages/agentic-core/`
- `src/providers/` deleted — no more self-contained provider logic
- 174/174 tests pass

**Remaining vision gaps:**
1. **Streaming**: Vision mandates `streaming` as agentic-core responsibility. No streaming API exists. Need `runAgentLoopStream()` or streaming variant that yields chunks in real-time.
2. **Code timeout enforcement**: `toolConfig.code.timeout` is declared in types but never enforced in executeCode. Need to wire timeout into QuickJS/Pyodide/python3 via Promise.race() or AbortController.

## Scope
- Add streaming support to agentic-core (Provider.stream() method, runAgentLoopStream)
- Expose streaming variant in agentic-lite (askStream or config option)
- Enforce toolConfig.code.timeout in code.ts executeCode
- Update ARCHITECTURE.md to reflect streaming API
- All existing tests must pass + new tests for streaming and timeout

## Acceptance Criteria
- agentic-core exports a streaming interface (Provider.stream or similar)
- ask.ts exposes a streaming entry point or option
- code.ts respects toolConfig.code.timeout via Promise.race()
- All tests pass
- Vision gap evaluation reflects ≥90% match
