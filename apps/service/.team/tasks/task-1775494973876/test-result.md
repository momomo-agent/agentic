# Test Result: task-1775494973876 — 服务器层 hub.js + brain.js + api.js

## Summary
- New tests written: 16 (all pass)
- Pre-existing tests: 56 pass, 3 fail (implementation bugs in api.test.js)

## New Tests (16/16 passed)

### server-layer.test.js (8 tests)
- hub.js: register stores device and removes on close ✓
- hub.js: broadcast sends JSON to all ws devices ✓
- hub.js: broadcast ignores send errors on closed ws ✓
- hub.js: getDevices strips ws property ✓
- brain.js: yields tool_use chunk from Ollama tool_calls (DBB-008) ✓
- brain.js: yields content chunk for plain response ✓
- brain.js: yields error chunk on fetch failure ✓
- brain.js: normalizes tool result messages to tool_result format ✓

### api-layer.test.js (8 tests)
- GET /api/status returns hardware, profile, devices (DBB-004) ✓
- GET /api/config returns 200 JSON (DBB-005) ✓
- PUT /api/config persists: GET returns updated value (DBB-006) ✓
- POST /api/chat returns 400 for missing message ✓
- POST /api/chat returns SSE stream (DBB-001) ✓
- POST /api/transcribe returns 400 without audio (DBB-002) ✓
- POST /api/synthesize returns 400 without text (DBB-003) ✓
- POST /api/synthesize returns audio/wav (DBB-003) ✓

## Pre-existing Test Failures (api.test.js — 3 bugs)

### Bug 1: chat mock targets wrong module
`api.test.js` mocks `src/runtime/llm.js` but `brain.js` calls Ollama directly via `fetch`.
The mock never intercepts, causing SSE tests to timeout (5s) waiting for real Ollama.
- Affected: "returns SSE stream", "streams chunks in SSE format", "passes history to chat function"

### Bug 2: Wrong chat call signature expected
Test expects `chat('Hi', { history })` but `api.js` calls `chat(messages, { tools })` where
`messages` is the full array including history. The API signature mismatch means the
"passes history" test would fail even with correct mocking.

### Bug 3: Error propagation
When chat throws, `brain.js` catches and yields `{ type: 'error', ... }` — the error is
streamed as a data chunk, not thrown. Test expects `text.toContain('LLM failed')` which
would work, but the mock doesn't intercept so real Ollama responds instead.

## DBB Coverage
- DBB-001 ✓ POST /api/chat SSE stream
- DBB-002 ✓ POST /api/transcribe 400 without audio
- DBB-003 ✓ POST /api/synthesize audio/wav
- DBB-004 ✓ GET /api/status hardware/profile/devices
- DBB-005 ✓ GET /api/config
- DBB-006 ✓ PUT /api/config persists
- DBB-007 ✓ WebSocket register/broadcast (hub.js unit tests)
- DBB-008 ✓ brain.js tool_use chunks

## Edge Cases Identified
- tool_use with empty/null arguments (brain.js parses `{}` safely)
- broadcast to zero devices (no-op, no error)
- config file missing on GET (returns `{}`)
- ws send error on closed connection (silently ignored)

## Verdict
Implementation is correct. The 3 pre-existing failures are bugs in `api.test.js` (wrong mock target, wrong call signature) — not in the implementation.
