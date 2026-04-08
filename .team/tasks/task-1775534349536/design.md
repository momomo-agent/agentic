# Design: Verify test coverage >=98% threshold

## Goal
Confirm `vitest.config.js` enforces ≥98% coverage and that `npm test -- --coverage` passes.

## Current State
`vitest.config.js` already has:
```js
coverage: {
  thresholds: { lines: 98, functions: 98, branches: 98, statements: 98 }
}
```

## Steps

### 1. Run coverage report
```bash
npm test -- --coverage
```
- Vitest will fail with non-zero exit if any threshold is not met.
- Fix any uncovered lines until all thresholds pass.

### 2. Files likely needing coverage gaps closed
- `src/detector/hardware.js` — edge: unsupported platform/arch
- `src/detector/profiles.js` — edge: network failure, cache miss
- `src/runtime/llm.js` — edge: Ollama timeout → fallback path
- `src/server/api.js` — error response branches (400, 500)

### 3. No config changes needed
Thresholds are already set. Task is complete when `npm test -- --coverage` exits 0.

## Verification
```bash
npm test -- --coverage
# All lines/branches/functions/statements ≥98% → exit 0
```

## Edge Cases
- If a module has 0 tests, coverage will be 0% → add at minimum a smoke test.
- Branch coverage requires both true/false paths tested for every conditional.
