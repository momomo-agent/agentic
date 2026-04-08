# Design: 测试覆盖率补全 ≥98%

## Files to Create/Modify

- `test/m16-coverage.test.js` — new coverage threshold enforcement test
- `package.json` — add `--coverage` threshold config to jest/vitest

## Approach

1. Identify uncovered code paths by running `npm test -- --coverage` and reading the report.
2. Add targeted tests for each uncovered branch/function.
3. Configure coverage threshold in `package.json` so CI fails below 98%.

## Coverage Threshold Config (package.json)

```json
"jest": {
  "coverageThreshold": {
    "global": {
      "statements": 98,
      "lines": 98,
      "branches": 98,
      "functions": 98
    }
  }
}
```

## Test File: test/m16-coverage.test.js

```javascript
// Verifies coverage threshold is configured in package.json
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const threshold = pkg?.jest?.coverageThreshold?.global ?? pkg?.vitest?.coverage?.thresholds;
assert.ok(threshold, 'Coverage threshold must be configured');
const min = threshold.statements ?? threshold.lines ?? 0;
assert.ok(min >= 98, `Coverage threshold must be >= 98, got ${min}`);
console.log('PASS: coverage threshold >= 98% configured');
```

## Edge Cases

- If using vitest instead of jest, threshold lives under `vitest.coverage.thresholds` in `package.json` or `vite.config.js` — check which test runner is active first.
- Do not delete existing tests; only add new ones.

## Dependencies

- Existing test runner (jest or vitest) — check `package.json` scripts.

## Test Cases to Verify

- `npm test -- --coverage` exits 0 with ≥98% on all metrics.
- Removing a test causes exit code non-0 (manual verification).
