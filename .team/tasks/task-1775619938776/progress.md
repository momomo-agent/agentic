# Trim ask.ts to under 100 lines

## Changes Made
- Removed `Accumulators` interface (8 lines), inlined type directly into `handleToolCall` parameter
- Merged `ProviderToolCall` and `ToolDefinition` imports into the main `agentic-core` import
- Removed `// --- Tool execution ---` comment and unnecessary blank lines
- Compacted accumulator type from 7-line multi-line to single-line inline type
- Removed blank line between `handleToolCall` and `buildToolDefs`

## Result
- **Before**: 116 lines
- **After**: 99 lines (≤99 target met)
- **All 174 tests pass**
- **All functionality preserved** — no logic changes, only structural compression

## Verification
- `wc -l src/ask.ts` → 99
- `npx vitest run` → 174/174 passed
