# M101 DBB Check — Engine Registry Unification

**Date:** 2026-04-11T15:50:00Z
**Match:** 100%

## Summary

M101 engine registry unification is complete. brain.js, stt.js, and tts.js all migrated to use `engine/registry.js` (resolveModel, modelsForCapability). Legacy getModelPool removed. Dead files cleaned. API routes unified with deprecation headers. All 1193 tests pass.

## Criteria Results

| # | Criterion | Status |
|---|-----------|--------|
| 001 | Chat completions via Engine Registry | PASS |
| 002 | Ollama /api/chat unchanged | PASS |
| 003 | brain.js no getModelPool import | PASS |
| 004 | STT via Engine Registry | PASS |
| 005 | STT no detector imports | PASS |
| 006 | STT fallback chain | PASS |
| 007 | TTS via Engine Registry | PASS |
| 008 | TTS no hardware profile imports | PASS |
| 009 | TTS switchable via assignments | PASS |
| 010 | Dead files removed | PASS |
| 011 | Duplicate /api/ollama routes removed | PASS |
| 012 | Legacy /api/model-pool proxied | PASS |
| 013 | Deprecation headers present | PASS |
| 014 | All existing tests pass (198 files, 1193 passed, 0 failures) | PASS |
| 015 | No regression in chat completions | PASS |

## Evidence

- `engine-registry-brain.test.js`: 14/14 tests pass
- Full test suite: 198 files, 1193 passed, 11 skipped, 0 failures
- `grep getModelPool src/server/brain.js` → empty
- `grep detect src/runtime/stt.js` → empty
- No `/api/ollama` routes in api.js
- `/api/model-pool` returns X-Deprecated and Deprecation headers
