# Three Paths Architecture Spec

## Goal
Make agentic-core and agentic-service work together with three communication paths, all verified with tests.

## Three Paths

### Path 1: App ←WS→ service (local inference)
- App connects to service via WebSocket
- service uses local engine (Ollama) to run inference
- core is used internally by service (in-process, no network)
- Already partially working: service has WebSocket (hub.js) + brain.js now imports core

### Path 2: App ←WS→ service ←HTTP→ cloud API (service as proxy)
- App connects to service via WebSocket
- service uses core to call cloud API (Anthropic/OpenAI) via HTTP
- API keys stay on service, not exposed to client
- brain.js already has cloud fallback logic + now uses core for HTTP calls

### Path 3: App ←HTTP→ core → cloud API (direct, no service)
- App uses core directly in browser/Node
- core calls cloud API via HTTP
- Already working: core's agenticAsk does this

## What Needs to Be Done

### 1. Verify service brain.js works with core (Path 1 & 2)
- brain.js was just rewritten to use core via registerProvider
- Need to verify the bridge between engine registry and core's provider system works
- Write a test that mocks an engine and verifies core routes through it

### 2. WebSocket chat protocol (Path 1 & 2)
- hub.js already has WebSocket server
- Need to verify the chat flow: WS message → brain.chat() → stream chunks back via WS
- Check hub.js handles the new brain.chat() async generator output correctly

### 3. Core standalone test (Path 3)
- Verify core's agenticAsk works independently with mock HTTP
- Already has tests (16 passing)

### 4. Integration test: all three paths
- Write a test file that verifies:
  - Path 1: mock Ollama engine → service → WS client gets response
  - Path 2: mock cloud API → service (via core) → WS client gets response  
  - Path 3: mock cloud API → core directly → response

## Files to Touch
- `packages/core/agentic-core.js` — registerProvider already added, verify it works
- `apps/service/src/server/brain.js` — just rewritten, needs testing
- `apps/service/src/server/hub.js` — check WS chat handler uses brain.chat() correctly
- `apps/service/test/three-paths.test.js` — NEW: integration test

## Key Constraints
- Don't break existing tests (1919 passing)
- core must remain zero-dependency (browser + Node compatible)
- service's engine registry stays as-is, just bridged to core via registerProvider
- WebSocket protocol stays compatible with existing clients (agentic-lite, etc.)

## Verification
- `npx vitest run apps/service/test/three-paths.test.js` passes
- `npx vitest run packages/core/test/` passes (16 existing + new)
- All three paths demonstrated working in test output
