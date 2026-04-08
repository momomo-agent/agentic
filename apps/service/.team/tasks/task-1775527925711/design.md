# Design: Test coverage >=98% threshold enforcement

## File
- `vitest.config.js`

## Change
Add coverage threshold to vitest config:

```js
coverage: {
  provider: 'v8',
  thresholds: {
    lines: 98,
    functions: 98,
    branches: 98,
    statements: 98
  }
}
```

## CI Integration
- `npm test -- --coverage` already runs in CI
- vitest exits non-zero if any threshold is not met — CI fails automatically

## Edge Cases
- If coverage provider not installed: `npm i -D @vitest/coverage-v8`
- Existing coverage config must be merged, not replaced

## Test Cases
- Run `npm test -- --coverage` with threshold set → passes at >=98%
- Artificially remove a test → coverage drops → CI fails
