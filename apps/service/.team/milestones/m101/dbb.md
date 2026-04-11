# M101 DBB — 引擎层贯通 (Engine Registry Unification)

## DBB-001: Chat completions via Engine Registry
- Requirement: F1 (brain.js 切到 Engine Registry)
- Given: POST `/v1/chat/completions` with `{"model":"any-model","messages":[{"role":"user","content":"hello"}]}`
- Expect: 200 response with streamed/non-streamed chat completion in OpenAI format
- Verify: Response contains `choices[0].message.content` (non-stream) or SSE `data:` chunks (stream)

## DBB-002: Ollama chat endpoint unchanged
- Requirement: F1 (保持 `/api/chat` 行为不变)
- Given: POST `/api/chat` with `{"model":"gemma4","messages":[{"role":"user","content":"hi"}]}`
- Expect: 200 response, same format as before migration
- Verify: Response structure matches Ollama chat format

## DBB-003: brain.js no longer imports getModelPool
- Requirement: F1 (删除对 getModelPool 的依赖)
- Given: Inspect `src/server/brain.js` imports
- Expect: No import/require of `getModelPool` from config
- Verify: `grep -r "getModelPool" src/server/brain.js` returns empty

## DBB-004: STT resolves via Engine Registry
- Requirement: F2 (stt.js 切到 Engine Registry)
- Given: POST `/v1/audio/transcriptions` with audio file
- Expect: Transcription returned, engine resolved via registry assignments
- Verify: Response contains `text` field with transcription result

## DBB-005: STT no longer imports detector
- Requirement: F2 (删除对 detect/getProfile 的直接调用)
- Given: Inspect `src/runtime/stt.js` imports
- Expect: No import/require of `detect` or `getProfile` from detector/
- Verify: `grep -r "detect\|getProfile" src/runtime/stt.js` returns empty (excluding comments)

## DBB-006: STT fallback chain
- Requirement: F2 (fallback 链)
- Given: Primary STT engine is unavailable (health check fails)
- Expect: System automatically falls back to next available STT engine
- Verify: Transcription still succeeds with degraded engine, no user-visible error

## DBB-007: TTS resolves via Engine Registry
- Requirement: F3 (tts.js 切到 Engine Registry)
- Given: POST `/v1/audio/speech` with `{"input":"hello","voice":"default"}`
- Expect: Audio data returned, engine resolved via registry assignments
- Verify: Response is audio content (binary) with appropriate content-type

## DBB-008: TTS no longer imports hardware profile
- Requirement: F3 (删除对 hardware profile 的直接依赖)
- Given: Inspect `src/runtime/tts.js` imports
- Expect: No import/require of detector/ or hardware profile modules
- Verify: `grep -r "getProfile\|detect\|hardware" src/runtime/tts.js` returns empty (excluding comments)

## DBB-009: TTS backend switchable via assignments
- Requirement: F3 (支持通过 assignments.tts 切换 TTS 后端)
- Given: assignments.tts is set to a different TTS engine ID
- Expect: TTS requests route to the newly assigned engine
- Verify: Audio output is produced by the assigned engine

## DBB-010: Dead files removed
- Requirement: F4 (清理死文件)
- Given: Check filesystem for listed dead files
- Expect: None of these files exist:
  - `LocalModelsView.vue`
  - `CloudModelsView.vue`
  - `App-old.vue`
  - `ConfigPanel.vue`
  - `runtime/memory.js`
- Verify: `find . -name "LocalModelsView.vue" -o -name "CloudModelsView.vue" -o -name "App-old.vue" -o -name "ConfigPanel.vue" -o -name "memory.js" -path "*/runtime/*"` returns empty

## DBB-011: Duplicate Ollama routes removed
- Requirement: F4 (清理 api.js 中的重复路由)
- Given: Inspect `src/server/api.js` route definitions
- Expect: No `/api/ollama/*` routes remain; only `/api/engines/*` routes exist
- Verify: `grep "/api/ollama" src/server/api.js` returns empty

## DBB-012: Legacy model-pool endpoint proxied
- Requirement: F5 (API 路由统一)
- Given: GET `/api/model-pool`
- Expect: 200 response with same data as `/api/engines/models`, plus deprecation warning header
- Verify: Response header contains deprecation warning (e.g., `Deprecation` or `Warning` header)

## DBB-013: Deprecation header present on legacy route
- Requirement: F5 (新增 deprecation warning header)
- Given: GET `/api/model-pool`
- Expect: Response includes a header indicating this endpoint is deprecated
- Verify: Check response headers for `Deprecation` or `Warning` or `X-Deprecated` header with sunset info

## DBB-014: All existing tests pass
- Requirement: 验收标准 (现有测试全部通过)
- Given: Run full test suite (`npm test` or `vitest run`)
- Expect: All tests pass (0 failures), no regressions
- Verify: Test runner exit code 0, all previously passing tests still pass

## DBB-015: No regression in chat completions
- Requirement: 验收标准 (`/v1/chat/completions` 行为不变)
- Given: Same requests that worked before migration
- Expect: Identical response format, same model routing behavior, same error codes
- Verify: Regression test suite for `/v1/chat/completions` passes with no diff in response schema
