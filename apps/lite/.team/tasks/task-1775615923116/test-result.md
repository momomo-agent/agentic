# Test Results: Extract agent loop + provider into agentic-core

## Summary
- **Status**: PASS
- **Tests Run**: 67 new tests + 107 regression tests = 174 total
- **Passed**: 174/174
- **Failed**: 0

## Acceptance Criteria (from design.md)

| # | Criterion | Result |
|---|-----------|--------|
| 1 | `cd packages/agentic-core && npm run build` exits 0 | PASS |
| 2 | All types exported: Provider, ProviderMessage, ToolDefinition, ProviderToolCall, runAgentLoop, createProvider | PASS |
| 3 | No imports from agentic-lite (grep returns nothing) | PASS |
| 4 | No imports from agentic-filesystem, agentic-shell, quickjs, pyodide | PASS |

## DBB Coverage (M27)

| DBB ID | Criterion | Status | Notes |
|--------|-----------|--------|-------|
| DBB-001 | agentic-core package exists and builds | PASS | Build succeeds in ~670ms, generates dist/index.js (9.35 KB) + dist/index.d.ts (2.15 KB) |
| DBB-002 | All required exports present | PASS | 14 type/function exports verified in dist/index.d.ts |
| DBB-003 | No forbidden imports | PASS | 30 grep checks across 6 source files, all clean |
| DBB-004 | runAgentLoop behavior | PASS | 8 tests: single round, multi-round, usage accumulation, max rounds limit, multiple tool calls per round, systemPrompt passthrough, message sequencing |
| DBB-005 | createProvider factory | PASS | 13 tests: anthropic/openai/custom creation, validation, auto-detection |

## Test Details

### Build Verification (3 tests)
- npm run build exits 0
- dist/index.js generated with non-empty content
- dist/index.d.ts generated with non-empty content

### Export Verification (14 tests)
- Functions: runAgentLoop, createProvider, createAnthropicProvider, createOpenAIProvider
- Interfaces: Provider, ProviderMessage, ToolDefinition, ProviderToolCall, ProviderConfig, AgentLoopConfig, AgentLoopResult, ProviderResponse, ProviderToolContent
- Provider.chat signature: (messages, tools, system?) => Promise<ProviderResponse>

### Import Safety (30 tests — 6 files × 5 forbidden patterns)
- No agentic-lite, agentic-filesystem, agentic-shell, quickjs, pyodide imports in any source file

### Agent Loop Tests (8 tests)
1. Returns final answer on stopReason=end
2. Continues through tool rounds until final response
3. Accumulates usage across rounds
4. Throws after exceeding maxToolRounds (custom value: 3)
5. Uses default maxToolRounds of 10
6. Handles multiple tool calls in single round
7. Passes systemPrompt to provider.chat
8. Sends user prompt as first message
9. Pushes assistant and tool messages after tool execution

### Provider Factory Tests (13 tests)
1. Creates anthropic provider with valid sk-ant- key
2. Creates openai provider with valid sk- key
3. Creates custom provider from customProvider object
4. Creates custom provider from baseUrl (falls back to openai)
5. Throws for missing apiKey on non-custom provider
6. Throws for invalid anthropic apiKey format
7. Throws for invalid openai apiKey format
8. Throws for unknown provider
9. Throws for custom provider without customProvider or baseUrl
10. Auto-detects anthropic from sk-ant- prefix
11. Auto-detects anthropic from baseUrl containing anthropic
12. Auto-detects openai as default

## Regression
- Existing 107 tests across 30 files: ALL PASS (0 regressions)

## Edge Cases Identified
- Tool executor returning non-string output (covered by String(output) in loop.ts)
- Empty toolCalls array with stopReason='tool_use' (not explicitly tested — loop would return empty results on final round)
- rawContent undefined (loop falls back to response.text via `response.rawContent ?? response.text ?? ''`)
