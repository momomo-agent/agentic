# Test Coverage >=98% Threshold Enforcement

## Files to modify
- `package.json` — add coverage threshold config

## Algorithm
1. Check current test runner (vitest or jest) in `package.json`
2. Add coverage threshold: `{ lines: 98, functions: 98, branches: 98, statements: 98 }`
3. Run `npm test -- --coverage` to verify threshold passes or identify gaps
4. Add missing tests for uncovered lines

## Config (vitest example)
```js
// vite.config.js or vitest.config.js
coverage: {
  thresholds: { lines: 98, functions: 98, branches: 98, statements: 98 },
  reporter: ['text', 'lcov']
}
```

## Edge cases
- If coverage < 98%: add unit tests for uncovered paths, not just threshold config
- Generated/vendor files: exclude from coverage via `exclude` patterns

## Test cases
- `npm test -- --coverage` exits 0 with >=98% on all metrics
