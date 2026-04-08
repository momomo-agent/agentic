# Test Result: Fix ask() systemPrompt positional param

## Status: PASS

## Verification
- `src/ask.ts` line 14: `ask(prompt: string, config: AgenticConfig)` — systemPrompt via config ✓
- `src/index.ts`: exports `ask` correctly ✓
- `npm run build`: success ✓
- `npm test`: 64/64 passed ✓

## DBB criteria met
2. `ask()` signature matches ARCHITECTURE.md spec — systemPrompt in config object ✓
5. All existing tests pass ✓
6. TypeScript compiles without errors ✓
