# Verify npx agentic-service one-command startup

## Progress

All checks passed:
1. `package.json` bin field correct
2. Shebang present on line 1
3. `node bin/agentic-service.js --skip-setup --port 3099` starts successfully
4. `GET /api/status` returns 200 with valid JSON `{ hardware, profile, ollama, devices }`
5. SIGINT/SIGTERM handlers wired via `startDrain()`/`waitDrain()`

Non-fatal warnings (expected, non-blocking):
- `[sense] arecord not found` — wake word disabled on macOS
- `Cannot find package 'agentic-voice'` — optional TTS dep

Fix applied: `src/runtime/sense.js` — added `_recorder.process?.on('error', ...)` to handle `spawn sox ENOENT` gracefully (was crashing with unhandled error on child process).
