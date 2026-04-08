# Task Design: Verify and Fix agentic-sense External Package Wiring

## Problem
DBB reports agentic-sense uses `#agentic-sense` import map and may be missing from package.json. Need to verify all 4 agentic-* packages are properly wired.

## Current State (verified)
- `src/runtime/adapters/sense.js` — imports `'agentic-sense'` directly ✓
- `src/runtime/adapters/embed.js` — imports `'agentic-embed'` directly ✓
- `package.json` dependencies — all 4 agentic-* listed as `file:./vendor/*.tgz` ✓
- `package.json` imports — STILL has `#agentic-sense`, `#agentic-voice`, `#agentic-embed` ← **stale**

## Fix Required

### Step 1: Clean package.json imports map
**File:** `package.json` `imports` field
**Action:** Remove all stale import map entries that duplicate npm dependencies:
- Remove `"#agentic-embed": "./src/runtime/adapters/embed.js"` (dep provides this)
- Remove `"#agentic-voice": "./src/runtime/adapters/voice/openai-tts.js"` (dep provides this)
- Remove `"#agentic-sense": "./src/runtime/adapters/sense.js"` (dep provides this)

Keep only non-agentic imports if any exist.

### Step 2: Update vitest config aliases
**File:** `vitest.config.js`
**Action:** Remove `"#agentic-embed"` alias (if still present) — no longer needed since we use npm packages directly

### Step 3: Fix test files using `#`-prefixed imports
**Files:** Any test file mocking `'#agentic-sense'`, `'#agentic-voice'`, `'#agentic-embed'`
**Action:** Change mocks to use the unprefixed package name:
- `vi.mock('#agentic-sense', ...)` → `vi.mock('agentic-sense', ...)`
- `vi.mock('#agentic-voice', ...)` → `vi.mock('agentic-voice', ...)`
- `vi.mock('#agentic-embed', ...)` → `vi.mock('agentic-embed', ...)`

### Step 4: Verify vendor packages exist
**Check:** `ls -la vendor/agentic-*.tgz` — all 4 present
**If missing:** Create minimal stub tgz or report as blocker

## Verification
1. `grep -r '#agentic-sense\|#agentic-voice\|#agentic-embed\|#agentic-store' src/ test/ package.json` — no matches
2. `node -e "require('agentic-sense')"` — resolves (may throw runtime error but import resolution works)
3. `npx vitest run test/m84-sense-external-package.test.js` — passes
4. `npx vitest run test/m86-sense-wiring.test.js` — passes
5. `npx vitest run test/integration/agentic-sense-wiring.test.js` — passes

## Dependencies
- Shares `package.json` edit with task-1775588279635 (both remove import map entries)
- Should coordinate: either task can apply the package.json fix, the other confirms
