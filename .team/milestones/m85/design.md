# M85 Technical Design

## 1. agentic-sense Import Map Wiring

Add `"#agentic-sense": "./src/runtime/adapters/sense.js"` to `package.json` `imports`.
`src/runtime/sense.js` already imports from `'agentic-sense'` directly — update it to use `#agentic-sense`.
`src/runtime/adapters/sense.js` already exists and exports `createPipeline`.

## 2. Test Pass Rate ≥90%

After M83 lands (mocked module init fix), run `vitest run` to identify remaining failures.
Fix categories expected: import resolution errors, missing mocks, async teardown issues.
Target: ≥591/657 passing.

## 3. Architecture Docs

Add four sections to `ARCHITECTURE.md`:
- **tunnel.js** — LAN tunnel via ngrok/cloudflared, spawns subprocess, handles SIGINT
- **src/cli/** — setup.js (Ollama install + model pull wizard), browser.js (open browser after start)
- **runtime/vad.js** — RMS energy VAD, `detectVoiceActivity(buffer) → boolean`
- **HTTPS/middleware** — cert.js (self-signed), httpsServer.js (wraps express), middleware.js (error handler)
