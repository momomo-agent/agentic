# Design: Push test pass rate to >=90%

## Prerequisite
Blocked by task-1775535895960 (M83 mocked module init fix). Must land first.

## Steps
1. Run `vitest run 2>&1 | tail -20` to get current failure count
2. Group failures by error type (import errors, missing mocks, async teardown)
3. Fix in order: import resolution → missing mocks → async issues

## Common Fix Patterns

### Import resolution errors
- Add missing `#agentic-*` entries to `package.json` imports
- Ensure test vitest config has `resolve.alias` matching import map

### Missing mocks
- Add `vi.mock('#agentic-sense', ...)` stubs in affected test files
- Pattern: `vi.mock('#agentic-X', () => ({ default: {}, createPipeline: vi.fn() }))`

### Async teardown
- Add `afterEach(() => vi.clearAllMocks())` where missing
- Ensure `server.close()` called in afterAll

## Target
≥591 passing / 657 total (≥90%)

## Verification
```bash
vitest run | grep "Tests "
# e.g. "Tests  591 passed | 66 failed"
```
