# Remove src/providers/ dead code — switch imports to agentic-core

## Progress

### Changes Made

1. **src/index.ts**: Changed `createProvider` and `Provider` exports from `'./providers/index.js'` to `'agentic-core'`
2. **src/types.ts**: Changed `Provider` import from `'./providers/index.js'` to `'agentic-core'`
3. **src/tools/shell.ts, code.ts, file.ts, search.ts**: Changed `ToolDefinition` import from `'../providers/provider.js'` to `'agentic-core'`
4. **Deleted `src/providers/` directory** (4 files: anthropic.ts, openai.ts, provider.ts, index.ts)
5. **Updated 6 test files** that imported from the deleted providers directory to import from `'agentic-core'` instead

### Test Results
- All 174 tests pass (32 test files)
- No regressions

### Notes
- `ask.ts` already imported from `agentic-core` — no changes needed
- Test files also needed updating since they imported from `../src/providers/`