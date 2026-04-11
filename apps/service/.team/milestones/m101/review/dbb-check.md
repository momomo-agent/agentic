# M101 DBB Check — Engine Registry Unification

**Date:** 2026-04-11T14:01:00Z
**Match:** 80%

## Summary

M101 engine registry unification is substantially complete. brain.js, stt.js, and tts.js all migrated to use `engine/registry.js` (resolveModel, modelsForCapability). Legacy getModelPool removed. Dead files cleaned. API routes unified with deprecation headers.

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
| 014 | All existing tests pass | FAIL |
| 015 | No regression in chat completions | PARTIAL |

## Blocking Issue

`engine-registry-brain.test.js` is failing. The static import checks pass, but the Ollama/Cloud engine `run()` integration tests fail. This blocks DBB-014 (all tests pass).

## Recommendation

Fix the engine-registry-brain.test.js failures (likely in Ollama engine streaming or Cloud engine import paths), then re-run full suite to confirm zero regressions.
