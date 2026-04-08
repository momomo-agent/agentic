# M27 DBB — agentic-core Extraction

## DBB-001: agentic-core package exists and builds
- Requirement: Create `packages/agentic-core/` with package.json, tsconfig, tsup.config
- Given: `packages/agentic-core/` directory is inspected
- Expect: `package.json`, `tsconfig.json`, and `tsup.config.ts` exist; package builds without errors
- Verify: `cd packages/agentic-core && npm run build` exits with code 0

## DBB-002: agentic-core exports core types and functions
- Requirement: agentic-core must export Provider, ProviderMessage, ToolDefinition, ProviderToolCall, runAgentLoop(), createProvider()
- Given: agentic-core built output is inspected for exports
- Expect: All specified types and functions are exported from the package entry point
- Verify: `import { runAgentLoop, createProvider, Provider, ToolDefinition } from 'agentic-core'` resolves without TypeScript errors

## DBB-003: ask.ts is a thin integration layer (< 100 lines)
- Requirement: ask.ts imports from agentic-core and stays under 100 lines
- Given: `src/ask.ts` is read after refactoring
- Expect: File has fewer than 100 lines and imports core logic from agentic-core
- Verify: `wc -l src/ask.ts` reports < 100 lines; file contains import from agentic-core

## DBB-004: agentic-lite imports agentic-core
- Requirement: agentic-lite depends on agentic-core
- Given: `package.json` and `src/ask.ts` are inspected
- Expect: agentic-core is listed as a dependency; ask.ts imports loop/provider from agentic-core
- Verify: `package.json` contains agentic-core in dependencies; `src/ask.ts` has `import` from agentic-core

## DBB-005: All 107 existing tests pass
- Requirement: No regressions from extraction
- Given: Full test suite is run after refactoring
- Expect: All 107 tests pass, exit code 0
- Verify: `npm test` output shows 107/107 passing

## DBB-006: Existing public API unchanged
- Requirement: `ask()` function signature and AgenticResult shape are identical to pre-extraction
- Given: A consumer calls `ask(prompt, config)` with the same config shape as before
- Expect: Function returns AgenticResult with same fields (answer, sources, images, codeResults, files, toolCalls, usage, shellResults)
- Verify: Existing integration tests that call `ask()` with various configs still pass without modification

## DBB-007: agentic-core has no tool implementations
- Requirement: agentic-core handles loop + providers + types, NOT tool implementations
- Given: agentic-core source is inspected for tool-specific code (search, file, shell, code exec)
- Expect: No tool execute functions in agentic-core; only abstract tool schema/dispatch interfaces
- Verify: `grep -r "quickjs\|pyodide\|AgenticFileSystem\|AgenticShell\|tavily\|serper" packages/agentic-core/src/` returns no matches

## DBB-008: agentic-lite retains tool implementations + system prompt
- Requirement: agentic-lite keeps tool implementations (search, code, file, shell) and system prompt assembly
- Given: `src/tools/` directory and `src/ask.ts` are inspected after refactoring
- Expect: All tool files remain in agentic-lite; system prompt logic stays in agentic-lite
- Verify: `src/tools/` contains search.ts, code.ts, file.ts, shell.ts; ask.ts assembles system prompt before passing to agentic-core loop

## DBB-009: ARCHITECTURE.md reflects new module structure
- Requirement: ARCHITECTURE.md documents agentic-core as a separate module
- Given: ARCHITECTURE.md is read
- Expect: Module structure section lists agentic-core (loop, providers, types), agentic-lite (integration layer, tools, system prompt)
- Verify: ARCHITECTURE.md mentions `packages/agentic-core/` and its responsibilities; data flow shows agentic-lite importing from agentic-core

## DBB-010: Vision gap closes to ≥90%
- Requirement: Extraction satisfies vision's modular architecture requirement
- Given: Vision score is recalculated after extraction
- Expect: Vision compliance score is ≥90%
- Verify: Monitor/gap analysis reports vision score ≥90% (up from ~82%)
