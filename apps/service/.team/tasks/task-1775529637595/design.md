# Design: Test coverage >=98% threshold enforcement

## Goal
vitest coverage threshold set to 98% — CI fails if coverage drops below.

## Acceptance Criteria
- `vitest --coverage` fails when coverage < 98%
- Threshold configured in `vitest.config.js`

## Approach
Add coverage thresholds to vitest config:
```js
coverage: { thresholds: { lines: 98, functions: 98, branches: 98, statements: 98 } }
```

## Files
- `vitest.config.js`
