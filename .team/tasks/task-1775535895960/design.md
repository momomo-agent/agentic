# Design: Fix mocked module initialization across failing test files

## Approach
Audit all test files that import modules with lazy `adapter = null` pattern (tts.js, stt.js, memory.js) and ensure `init()` is called before tests run.

## Pattern to fix
```js
// Add to any test file importing runtime modules:
import * as mod from '../src/runtime/<module>.js';
await mod.init(); // before first test
```

## Files to audit
- Any test importing `src/runtime/tts.js`, `src/runtime/stt.js`, `src/runtime/memory.js`
- Check for `adapter is null` or `not initialized` errors in test output

## Mock pattern for CI (no real packages)
```js
// Mock dynamic imports at top of test:
import { register } from 'node:module';
// or use --import flag with a mock loader
```

## Test to verify
`npm test` overall: ≥90% pass rate (≤12 failures out of 119)
