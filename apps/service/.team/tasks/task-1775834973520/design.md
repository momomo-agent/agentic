# Design: Fix test suite — get critical tests passing

**Task:** task-1775834973520
**Module:** Cross-cutting (Runtime, Detector, Server)
**ARCHITECTURE.md Sections:** 1. Detector, 2. Runtime, 3. Server

## Root Cause Analysis

66 test failures across 33 test files. Three root causes:

### RC-1: Deleted source files (commit e21f881e)

Commit `e21f881e` ("清理 5 个死文件") deleted 3 source files that tests still reference:

| Deleted file | Replacement | Tests affected |
|---|---|---|
| `src/runtime/llm.js` | `src/server/brain.js` (chat logic moved here) | llm-m14, m38-runtime, m94-voice-latency |
| `src/runtime/memory.js` | None (early vector memory, never wired in) | memory, memory-mutex-m10, m27-sense-memory, m95-architecture-docs |
| `src/detector/optimizer.js` | `detector/profiles.js` + `detector/matcher.js` | optimizer, m62-optimizer, m74-optimizer, m71-optimizer-adaptive, optimizer-m76, m21-optimizer |

**Impact:** 20+ test files fail with MODULE_NOT_FOUND or ENOENT.

### RC-2: Stale test assertions after refactors

| Test file | Issue |
|---|---|
| `docker-verification.test.js` | Asserts `workspace:*` deps exist in npm registry — `workspace:*` is pnpm protocol, not npm-resolvable |
| `m86-docker-fix.test.js` | Asserts `package.json` uses `file:` refs for agentic-* deps — now `workspace:*` |
| `m74-docker-e2e.test.js` | Requires live Docker daemon + built image — no skip guard |
| `m95-architecture-docs.test.js` | Regex expects `├──` tree chars for matcher.js/ollama.js — ARCHITECTURE.md uses plain text |
| `api-m2.test.js` | Expects `config.llm.provider`/`config.llm.model` — config DEFAULTS has no `llm` key |
| `api-m6.test.js` | Expects PUT/GET round-trip to return only PUT keys — `setConfig` deep-merges with full defaults |
| `api-layer.test.js` | Missing mocks for `engine/registry.js`, `hub.js`, `profiler.js`, `vad.js` — transitive import failures |

### RC-3: STT/TTS mock mismatches

| Test file | Issue |
|---|---|
| `stt-adaptive.test.js` | `vi.mock` hoisting bug — `mockGetProfile` captured as `undefined` at hoist time |
| `stt-tts-adaptive.test.js` | TTS on darwin resolves `macos-say` as platform default — tests don't mock `macos-say.js` |
| `stt-tts-m12.test.js` | Same `macos-say` issue; `transcribe()` returns empty string because mock adapter not wired |

## Fix Strategy

The task says "fix existing broken tests" and "do NOT write new tests." The correct approach is to **delete stale tests** that test removed functionality, and **fix tests** that test functionality that still exists but has moved.

### Group A: DELETE — Tests for deleted/removed functionality (22 tests, 11 files)

These tests test code that was intentionally deleted. The functionality no longer exists. Delete the test files:

```
test/optimizer.test.js                    — tests deleted optimizer.js
test/m62-optimizer.test.js                — tests deleted optimizer.js
test/m74-optimizer.test.js                — tests deleted optimizer.js
test/m21-optimizer.test.js                — tests deleted optimizer.js (setupOllama)
test/detector/m71-optimizer-adaptive.test.js  — tests deleted optimizer.js
test/detector/optimizer-m76.test.js       — tests deleted optimizer.js
test/runtime/memory.test.js               — tests deleted memory.js
test/runtime/memory-mutex-m10.test.js     — tests deleted memory.js
test/m27-sense-memory.test.js             — tests deleted memory.js (memory portion)
```

### Group B: FIX — Tests with stale assertions (update to match current code)

#### B1: `test/runtime/llm-m14.test.js`
- **Current:** Reads `src/runtime/llm.js` via `readFileSync` and checks source text
- **Fix:** Change to read `src/server/brain.js` instead. Update assertions to match brain.js content (it has `config` references, no hardcoded model names, uses `resolveModel()`)

#### B2: `test/runtime/m38-runtime.test.js`
- **Current:** Imports `{ chat }` from `../../src/runtime/llm.js`
- **Fix:** Change import to `../../src/server/brain.js`. Update mock targets from `../../src/runtime/llm.js` internals to brain.js internals. The `chat()` signature is the same (messages, options → async generator of {type, content/text, done}).

#### B3: `test/runtime/stt-adaptive.test.js`
- **Current:** `vi.mock` hoisting bug — `mockGetProfile` is `undefined` at hoist time
- **Fix:** Move `mockGetProfile` declaration above the `vi.mock` call, or use `vi.hoisted()` to declare it in the hoisted scope. Verify mock factory returns `{ getProfile: mockGetProfile }` correctly.

#### B4: `test/runtime/stt-tts-adaptive.test.js` and `test/runtime/stt-tts-m12.test.js`
- **Current:** TTS tests don't mock `macos-say.js`; on darwin, `tts.init()` resolves to `macos-say` as platform default
- **Fix:** Add `vi.mock('../../src/runtime/adapters/voice/macos-say.js', ...)` with a mock `synthesize` function. Or mock `process.platform` to avoid darwin-specific path.

#### B5: `test/m94-voice-latency-verification.test.js`
- **Current:** Reads `src/runtime/llm.js` to check for profiler marks
- **Fix:** Change to read `src/server/brain.js` which has `startMark('llm')` and `endMark('llm')` at lines 270/276.

#### B6: `test/m95-architecture-docs.test.js`
- **Current:** Regex `/├──\s*matcher\.js|└──\s*matcher\.js/` doesn't match ARCHITECTURE.md format
- **Fix:** Update regex to match the actual format in ARCHITECTURE.md (plain text `matcher.js` with `#` comment). Also remove assertions about `memory.js` exports (file deleted).

#### B7: `test/server/api-m2.test.js`
- **Current:** Expects `config.llm.provider` and `config.llm.model` in default config
- **Fix:** Update to expect the actual DEFAULTS shape: `modelPool`, `assignments`, `stt`, `tts`, `ollamaHost`. Mock `engine/init.js` to prevent `initEngines()` from running.

#### B8: `test/server/api-m6.test.js`
- **Current:** PUT/GET round-trip expects exact match of PUT body
- **Fix:** Assert that GET response *contains* the PUT keys (use `toMatchObject` instead of `toEqual`). Mock `engine/init.js`.

#### B9: `test/server/api-layer.test.js`
- **Current:** Missing mocks for transitive imports
- **Fix:** Add mocks for `../../src/engine/registry.js`, `../../src/server/hub.js`, `../../src/runtime/profiler.js`, `../../src/runtime/vad.js` to prevent module load failures.

### Group C: SKIP — Environment-dependent tests

#### C1: `test/docker-verification.test.js`
- **Fix:** Add `describe.skipIf(!process.env.CI)` or change `workspace:*` assertion to check for `workspace:*` instead of npm registry lookup.

#### C2: `test/m74-docker-e2e.test.js`
- **Fix:** Add skip guard: `describe.skipIf(!process.env.DOCKER_HOST && !isDockerAvailable())`.

#### C3: `test/m86-docker-fix.test.js`
- **Fix:** Update assertion from `file:` to `workspace:*` to match current package.json.

## Implementation Steps

1. Delete Group A test files (9 files)
2. Fix Group B tests (B1–B9, 9 files)
3. Fix Group C tests (C1–C3, 3 files)
4. Run `npx vitest run` to verify
5. If any remaining failures, iterate

## Files to Modify

| File | Action |
|---|---|
| `test/optimizer.test.js` | DELETE |
| `test/m62-optimizer.test.js` | DELETE |
| `test/m74-optimizer.test.js` | DELETE |
| `test/m21-optimizer.test.js` | DELETE |
| `test/detector/m71-optimizer-adaptive.test.js` | DELETE |
| `test/detector/optimizer-m76.test.js` | DELETE |
| `test/runtime/memory.test.js` | DELETE |
| `test/runtime/memory-mutex-m10.test.js` | DELETE |
| `test/m27-sense-memory.test.js` | DELETE |
| `test/runtime/llm-m14.test.js` | MODIFY — point to brain.js |
| `test/runtime/m38-runtime.test.js` | MODIFY — import from brain.js |
| `test/runtime/stt-adaptive.test.js` | MODIFY — fix vi.mock hoisting |
| `test/runtime/stt-tts-adaptive.test.js` | MODIFY — mock macos-say.js |
| `test/runtime/stt-tts-m12.test.js` | MODIFY — mock macos-say.js |
| `test/m94-voice-latency-verification.test.js` | MODIFY — read brain.js |
| `test/m95-architecture-docs.test.js` | MODIFY — fix regex, remove memory.js assertions |
| `test/server/api-m2.test.js` | MODIFY — fix config shape, mock engine/init |
| `test/server/api-m6.test.js` | MODIFY — use toMatchObject, mock engine/init |
| `test/server/api-layer.test.js` | MODIFY — add missing mocks |
| `test/docker-verification.test.js` | MODIFY — fix workspace:* assertion |
| `test/m74-docker-e2e.test.js` | MODIFY — add Docker skip guard |
| `test/m86-docker-fix.test.js` | MODIFY — update file: → workspace:* |

## Verified Source APIs

```javascript
// src/server/brain.js (replacement for llm.js)
export function registerTool(name, fn)                    // line 49
export async function* chat(input, options = {})          // line 264
export async function chatSession(sessionId, userMessage, options = {})  // line 279
// Uses startMark('llm') at line 270, endMark('llm') at line 276

// src/config.js DEFAULTS (line 20-26)
{ modelPool: [], assignments: { chat, vision, stt, tts, embedding, chatFallback }, stt: { provider: 'whisper' }, tts: { provider: 'kokoro', voice: 'default' }, ollamaHost: 'http://localhost:11434' }

// src/runtime/stt.js
export async function init()                              // line 14
export async function transcribe(audioBuffer)             // line 41
// ADAPTERS: sensevoice, whisper, default (openai-whisper)

// src/runtime/tts.js
export async function init()                              // line 23
export async function synthesize(text)                    // line 61
// ADAPTERS: macos-say, piper, kokoro, elevenlabs, openai, default (openai-tts)
// Platform default on darwin: 'macos-say'
```

## ⚠️ Unverified Assumptions

- `m27-sense-memory.test.js` may have sense.js tests that still pass — only the memory portion is broken. Developer should check if the file can be partially preserved or if it should be fully deleted.
- `test/runtime/m38-runtime.test.js` also tests `tts.synthesize()` — the TTS portion may have the same `macos-say` mock issue as the other STT/TTS tests.

## Test Cases

After all fixes:
- `npx vitest run` should show 0 failures (or only Docker-environment failures when Docker is unavailable)
- Core module tests pass: brain (replacement for llm), stt, tts, api, hub
- No MODULE_NOT_FOUND errors in test output
