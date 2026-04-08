# Vision Check — m26 (Final Gap Verification & README Type Fix)

## Match: 82%

## Vision Source

Two de facto vision documents:

1. `.team/docs/vision.md` — Architectural vision: agentic-lite = agentic-core + agentic-filesystem + agentic-shell. ask.ts < 100 lines. Provider/loop/streaming delegated to agentic-core.
2. `.ai/vision.md` — Product framing: one function call, structured result with tool use. "More than raw API, lighter than LangChain." Zero config, no chain/graph/memory.

## Alignment

Core capabilities from `.team/docs/vision.md` are implemented:

1. **file_read / file_write** — Zero-config MemoryStorage default wired in `ask.ts:16`. agentic-filesystem handles storage backends.

2. **code_exec** — QuickJS async sandbox with filesystem injection for JavaScript. Auto-detects JS vs Python. Pyodide (browser) and python3 (Node) for Python.

3. **shell_exec** — Via agentic-shell, Node-only with browser guard.

4. **Multi-round agent loop** — `MAX_TOOL_ROUNDS=10` loop in `ask.ts:31-60`. Properly terminates on `stopReason !== 'tool_use'`.

Broader `.ai/vision.md` goals met:
- Single `ask()` function
- Zero config defaults
- No heavy frameworks
- Clean structured result (`AgenticResult`)

## Critical Divergence: No agentic-core

The `.team/docs/vision.md` architecture is explicit:

```
agentic-lite = agentic-core（LLM loop）+ agentic-filesystem + agentic-shell
```

**Current implementation has NO dependency on agentic-core.** The entire agent loop, provider abstraction, tool schema, and message handling are self-contained:
- `src/ask.ts` — 140 lines (vision target: < 100 lines)
- `src/providers/` — anthropic.ts, openai.ts, provider.ts (3 files)
- `src/types.ts` — all interfaces

Design principle violated: "provider 层、agent loop、streaming 全部委托给 agentic-core"

## Major Divergence: No streaming

Vision lists streaming as an agentic-core responsibility. No streaming support exists.

## Minor Divergence

- `toolConfig.code.timeout` declared in `types.ts:30` but never enforced in `executeCode`

## Recommendations

1. **Extract agentic-core**: If agentic-core package is not yet available, document this as architectural debt. The agent loop, provider layer, and tool schema should eventually be extracted.
2. **Reduce ask.ts**: Even without agentic-core, consider extracting provider/tool registration to approach the < 100 line target.
3. **Add streaming**: Implement `askStream()` for real-time UI updates during long agent loops.
4. **Enforce code timeout**: Wire `toolConfig.code.timeout` into QuickJS/Pyodide/python3 via `Promise.race()`.

## Match History

| Milestone | Match | Notes |
|-----------|-------|-------|
| m25       | 95%   | Previous assessment |
| m26       | 82%   | Re-evaluated: agentic-core gap is critical, not minor |
