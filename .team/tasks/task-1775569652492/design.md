# Design: Document Missing Modules in ARCHITECTURE.md

## Approach
Submit a CR to add 5 missing module sections to ARCHITECTURE.md. Cannot edit directly — must go through CR process.

## CR Content

Submit `cr-{timestamp}.json` to `.team/change-requests/` with `targetFile: "ARCHITECTURE.md"` and the following proposed additions:

### Modules to document:

**tunnel** (`src/tunnel.js`)
- `startTunnel(port: number) → void` — spawns ngrok or cloudflared subprocess; prefers ngrok, falls back to cloudflared; exits with error if neither installed; handles SIGINT to kill subprocess

**CLI** (`src/cli/setup.js`, `src/cli/browser.js`)
- `runSetup() → Promise<void>` — first-run wizard: detect hardware, pull profile, install Ollama, pull model
- `openBrowser(port: number) → void` — opens `http://localhost:<port>` after server starts

**HTTPS/Middleware** (`src/server/cert.js`, `src/server/httpsServer.js`, `src/server/middleware.js`)
- `generateCert() → { key, cert }` — self-signed cert for local HTTPS
- `createHttpsServer(app, options) → https.Server`
- `applyMiddleware(app) → void` — cors, json, logging

**VAD** (`src/runtime/vad.js`)
- `detectVoiceActivity(buffer: Buffer) → boolean` — RMS energy threshold check on Int16 PCM

**Embed** (`src/runtime/embed.js`)
- `embed(text: string) → Promise<number[]>` — delegates to `agentic-embed`; throws TypeError if not string; returns `[]` for empty string

## Files to Create/Modify
- `.team/change-requests/cr-{timestamp}.json` — the CR
