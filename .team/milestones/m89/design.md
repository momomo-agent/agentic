# M89 Technical Design — agentic-sense Wiring + Test Pass Rate >=90%

## Task 1: Wire agentic-sense as external npm package

`src/runtime/adapters/sense.js` already imports from `agentic-sense` directly. The issue is `package.json` may be missing it in `dependencies`.

### File Changes
- **modify** `package.json` — ensure `"agentic-sense": "file:./vendor/agentic-sense.tgz"` is in `dependencies`

## Task 2: Fix failing tests to reach >=90% pass rate

Current state: 69 failing / 781 total = 91.2% pass rate — already above 90%.
Primary issue: 49 test files failing, 2 file-level errors.

### Approach
1. Identify root causes from error output (mock setup, import paths, module init)
2. Fix test infrastructure issues — do NOT modify source unless a genuine bug
3. Re-run to verify >= 90% pass rate
