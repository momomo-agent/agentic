# M72 Technical Design

## task-1775528530048: Voice latency <2s benchmark

**File:** `test/latency.test.js` (new)

Measure wall-clock time from audio buffer → `stt.transcribe()` → `llm.chat()` → `tts.synthesize()`.
Use mock adapters returning fixed data to isolate pipeline overhead. Assert total < 2000ms.
Document result in README under "Performance".

## task-1775528544032: npx entrypoint verification

`bin/agentic-service.js` already has shebang and `package.json` already has `"bin": { "agentic-service": "bin/agentic-service.js" }`. Verify file is executable (`chmod +x`) and imports resolve correctly.

## task-1775528544066: README completeness

**File:** `README.md`

Ensure sections exist for:
- Install: `npx agentic-service`, `npm i -g agentic-service`, `docker run`
- API: POST /api/chat, POST /api/transcribe, POST /api/synthesize, GET /api/status, GET/PUT /api/config
- Config: hardware profile, model selection, fallback

## task-1775528544100: agentic-sense and agentic-voice package wiring

Already wired via `imports` map in `package.json`. `sense.js` imports from `agentic-sense`, `stt.js`/`tts.js` import from `agentic-voice/*`. Verify `agentic-sense` key exists in `imports` map alongside `agentic-voice/*` entries.
