# Task: Set vitest coverage threshold to 98% and verify

## Objective
Add `coverageThreshold` config to `vitest.config.js` requiring 98% lines/branches/functions. Run `vitest --coverage` and confirm threshold passes.

## Files to Modify

### 1. `vitest.config.js`

**Add coverage configuration:**

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'test/**',
        '**/*.test.js',
        '**/*.spec.js',
        'bin/**',
        'install/**',
        '.team/**',
        'coverage/**',
        'dist/**'
      ],
      thresholds: {
        lines: 98,
        branches: 98,
        functions: 98,
        statements: 98
      },
      all: true,
      clean: true
    }
  }
});
```

### 2. `package.json`

**Add coverage scripts:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:coverage:ui": "vitest --coverage --ui",
    "test:watch": "vitest --watch"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "vitest": "^1.0.0"
  }
}
```

### 3. `.gitignore`

**Exclude coverage artifacts:**

```
# Coverage
coverage/
.nyc_output/
*.lcov
```

### 4. Create missing test files

**Identify uncovered files:**

```bash
# Run coverage to see what's missing
npm run test:coverage

# Expected output will show files below threshold
```

**Files that need tests:**

1. `src/detector/hardware.js` → `test/detector/hardware.test.js`
2. `src/detector/profiles.js` → `test/detector/profiles.test.js`
3. `src/detector/optimizer.js` → `test/detector/optimizer.test.js`
4. `src/runtime/llm.js` → `test/runtime/llm.test.js`
5. `src/runtime/stt.js` → `test/runtime/stt.test.js`
6. `src/runtime/tts.js` → `test/runtime/tts.test.js`
7. `src/runtime/sense.js` → `test/runtime/sense.test.js`
8. `src/runtime/memory.js` → `test/runtime/memory.test.js`
9. `src/server/hub.js` → `test/server/hub.test.js`
10. `src/server/brain.js` → `test/server/brain.test.js`
11. `src/server/api.js` → `test/server/api.test.js`

### 5. Example comprehensive test file

**`test/detector/hardware.test.js`:**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detect } from '../../src/detector/hardware.js';

describe('Hardware Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect platform', async () => {
    const hardware = await detect();
    expect(hardware.platform).toMatch(/darwin|linux|win32/);
  });

  it('should detect architecture', async () => {
    const hardware = await detect();
    expect(hardware.arch).toMatch(/arm64|x64/);
  });

  it('should detect CPU info', async () => {
    const hardware = await detect();
    expect(hardware.cpu).toHaveProperty('cores');
    expect(hardware.cpu).toHaveProperty('model');
    expect(hardware.cpu.cores).toBeGreaterThan(0);
  });

  it('should detect memory', async () => {
    const hardware = await detect();
    expect(hardware.memory).toBeGreaterThan(0);
  });

  it('should detect GPU type', async () => {
    const hardware = await detect();
    expect(hardware.gpu).toHaveProperty('type');
    expect(hardware.gpu.type).toMatch(/apple-silicon|nvidia|amd|none/);
  });

  it('should detect VRAM for GPU systems', async () => {
    const hardware = await detect();
    if (hardware.gpu.type !== 'none') {
      expect(hardware.gpu.vram).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle detection errors gracefully', async () => {
    // Mock a failure scenario
    vi.spyOn(process, 'platform', 'get').mockReturnValue('unknown');
    
    const hardware = await detect();
    expect(hardware).toBeDefined();
    expect(hardware.platform).toBeDefined();
  });

  it('should cache detection results', async () => {
    const result1 = await detect();
    const result2 = await detect();
    
    expect(result1).toEqual(result2);
  });
});
```

### 6. CI Integration

**`.github/workflows/test.yml`:**

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
```

## Algorithm

1. Install coverage dependencies (`@vitest/coverage-v8`)
2. Configure vitest.config.js with 98% thresholds
3. Run `npm run test:coverage` to identify gaps
4. Create missing test files for uncovered code
5. Write comprehensive tests covering:
   - Happy path
   - Error cases
   - Edge cases
   - Boundary conditions
6. Re-run coverage until 98% threshold met
7. Commit coverage config and tests

## Coverage Strategy

### What to Test

**100% Coverage Required:**
- Core business logic (detector, runtime, server)
- API endpoints
- Error handling paths
- Configuration loading

**Acceptable to Skip:**
- CLI entry points (bin/)
- Docker setup scripts (install/)
- Test files themselves
- Generated code

### How to Achieve 98%

1. **Test all functions:** Every exported function needs tests
2. **Test all branches:** if/else, switch cases, ternaries
3. **Test error paths:** throw/catch, error callbacks
4. **Test edge cases:** null, undefined, empty arrays, boundary values
5. **Mock external dependencies:** Ollama, file system, network calls

## Edge Cases

- **Flaky tests:** Use deterministic mocks, avoid timing dependencies
- **External services:** Mock all network calls
- **File system:** Use in-memory or temp directories
- **Platform-specific code:** Mock platform detection
- **Async code:** Properly await all promises

## Error Handling

- All test failures should be clear and actionable
- Coverage report should highlight uncovered lines
- CI should fail if coverage drops below 98%
- Provide helpful error messages for missing tests

## Dependencies

```json
{
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "vitest": "^1.0.0"
  }
}
```

## Test Cases

1. **Config test:** vitest.config.js has correct thresholds
2. **Coverage test:** All source files have corresponding test files
3. **Threshold test:** Coverage meets 98% for lines/branches/functions
4. **CI test:** Coverage runs in CI and fails on threshold miss

## Verification Commands

```bash
# Install dependencies
npm install --save-dev @vitest/coverage-v8

# Run coverage
npm run test:coverage

# Expected output:
# ✓ All files meet coverage thresholds
# Lines: 98.5% (target: 98%)
# Branches: 98.2% (target: 98%)
# Functions: 99.1% (target: 98%)
# Statements: 98.5% (target: 98%)

# View HTML report
open coverage/index.html

# Check specific file coverage
npm run test:coverage -- src/detector/hardware.js
```

## Coverage Report Example

```
File                    | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------|---------|----------|---------|---------|-------------------
All files               |   98.5  |   98.2   |   99.1  |   98.5  |
 src/detector           |   99.2  |   98.5   |  100.0  |   99.2  |
  hardware.js           |   99.0  |   98.0   |  100.0  |   99.0  | 45
  optimizer.js          |   99.5  |   99.0   |  100.0  |   99.5  |
  profiles.js           |   99.0  |   98.5   |  100.0  |   99.0  | 78
 src/runtime            |   98.1  |   97.8   |   98.5  |   98.1  |
  llm.js                |   98.5  |   98.0   |  100.0  |   98.5  | 123
  stt.js                |   97.8  |   97.5   |   97.0  |   97.8  | 56,89
  tts.js                |   98.0  |   98.0   |   98.0  |   98.0  |
 src/server             |   98.2  |   98.5   |   99.0  |   98.2  |
  api.js                |   98.0  |   98.0   |   99.0  |   98.0  | 234
  brain.js              |   98.5  |   99.0   |   99.0  |   98.5  |
  hub.js                |   98.0  |   98.5   |   99.0  |   98.0  |
```

## Notes

- 98% is aggressive but achievable for new code
- Focus on meaningful tests, not just coverage numbers
- Use coverage as a guide, not a goal
- Some lines may be legitimately hard to test (defensive checks)
- Consider lowering to 95% if 98% proves impractical
