# DBB Check — M4

**Match: 100%** | 2026-04-08T10:27:00Z

## Results

| # | Criterion | Status |
|---|-----------|--------|
| 1 | ask.ts loops up to MAX_TOOL_ROUNDS before throwing | ✅ pass |
| 2 | AgenticResult.images populated in all code paths | ✅ pass |
| 3 | AgenticConfig.systemPrompt passed to provider.chat() as system | ✅ pass |
| 4 | createProvider() with provider='custom' uses config.customProvider | ✅ pass |
| 5 | All four tasks have passing tests | ✅ pass |

## Evidence

- `ask.ts:31` — for-loop
- `ask.ts:40` — images always returned
- `ask.ts:32` — systemPrompt arg
- `provider.ts:63` — customProvider return
- `107 tests` — pass

## Result

5/5 criteria pass. All criteria fully met.
