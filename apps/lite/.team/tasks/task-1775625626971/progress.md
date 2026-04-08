# Progress — Browser verification + ask.ts slimming

## Task: task-1775625626971

### Completed

1. **ask.ts slimming** — Extracted `setupAgent(config): AgentSetup` helper. Both `ask()` and `askStream()` now call the shared helper instead of duplicating ~30 lines of setup code. Line count: 152 → 134 (18 lines removed).

2. **Bug fix**: `askStream()` now collects search images via the shared `setupAgent()` helper. Previously it called `buildTools(resolvedConfig)` without the images array, so search images were silently lost in streaming mode.

3. **Browser verification tests** — `test/browser-verification.test.ts` with 6 tests:
   - `isNodeEnv()` returns false when process is undefined
   - Shell tool excluded in browser (executeShell returns browser error)
   - Default filesystem is MemoryStorage — ask() does not throw
   - code_exec tool is registered and offered to provider in browser mode
   - ask() works in browser with mock provider
   - askStream() works in browser with mock provider

4. **Backward compatibility**: All 262 tests pass across 39 test files (0 failures). Public API unchanged.

### Notes
- QuickJS WASM loading fails when `process` is removed (simulated browser) — the code_exec test verifies tool registration via provider mock instead of WASM execution.
- `AgentSetup` interface and `setupAgent` are module-private (not exported).
