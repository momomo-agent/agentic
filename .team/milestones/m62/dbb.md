# M62 DBB — Server VAD + optimizer.js + SIGINT + Docker

## DBB-001: Server-side VAD suppresses silence
- Given: POST /api/transcribe with silence-only audio
- Expect: STT/LLM not invoked
- Verify: server logs show no STT call for silence audio

## DBB-002: VAD detects speech start/end
- Given: audio with speech then silence
- Expect: speech_start and speech_end events emitted
- Verify: unit test confirms both events

## DBB-003: optimizer.js returns non-null config for all hardware types
- Given: hardware with gpu.type = 'apple-silicon' | 'nvidia' | 'none'
- Expect: `optimize(hardware)` returns `{ threads, memoryLimit, model }` for each
- Verify: unit test for all three types

## DBB-004: SIGINT drains in-flight requests
- Given: active request when SIGINT received
- Expect: request completes before process.exit
- Verify: send request + SIGINT, confirm response received

## DBB-005: Docker build exits 0
- Given: project Dockerfile
- Expect: `docker build .` succeeds
- Verify: `docker build -t agentic-service-test . && echo OK`

## DBB-006: Docker container /api/status returns 200
- Given: running container
- Expect: health check passes
- Verify: `curl http://localhost:3000/api/status` returns 200
