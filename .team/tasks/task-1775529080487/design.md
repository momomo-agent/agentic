# Design: Test coverage >=98% threshold enforcement

## File to create
- `vitest.config.js` (project root)

## Content
```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 98,
        functions: 98,
        branches: 98,
        statements: 98,
      },
    },
  },
});
```

## Test cases
- `vitest run --coverage` with < 98% coverage → non-zero exit
- `vitest run --coverage` with >= 98% coverage → exits 0
