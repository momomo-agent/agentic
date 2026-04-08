# M87 Technical Design

## Task 1: Wire agentic-sense as external package

Remove the `#agentic-sense` import map alias from `vitest.config.js`. The package is already in `package.json` as a vendor tgz. `src/runtime/adapters/sense.js` already imports from `'agentic-sense'` directly — no source change needed.

**Change:** `vitest.config.js` — remove `'#agentic-sense'` alias line.

## Task 2: Document missing modules via CR

Submit a CR to add 5 module sections to ARCHITECTURE.md:
- `src/tunnel.js` — ngrok/cloudflared subprocess
- `src/cli/setup.js`, `src/cli/browser.js` — first-run wizard, browser open
- `src/server/cert.js`, `src/server/httpsServer.js`, `src/server/middleware.js` — HTTPS/middleware
- `src/runtime/vad.js` — voice activity detection
- `src/runtime/embed.js` — vector embedding via agentic-embed
