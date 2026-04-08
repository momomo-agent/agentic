# M85 DBB — Verification Criteria

## 1. agentic-sense Package Wiring
- [ ] `package.json` `imports` contains `"#agentic-sense": "./src/runtime/adapters/sense.js"`
- [ ] `src/runtime/sense.js` imports via `#agentic-sense` (not bare `agentic-sense`)
- [ ] `node --input-type=module <<< "import '#agentic-sense'"` resolves without error

## 2. Test Pass Rate ≥90%
- [ ] `vitest run` reports ≥591 passing out of 657 total
- [ ] No new test skips introduced to inflate pass rate

## 3. Architecture Docs
- [ ] `ARCHITECTURE.md` contains section for `tunnel.js` (LAN tunnel via ngrok/cloudflared)
- [ ] `ARCHITECTURE.md` contains section for `src/cli/` (setup.js, browser.js)
- [ ] `ARCHITECTURE.md` contains section for `runtime/vad.js` (voice activity detection)
- [ ] `ARCHITECTURE.md` contains section for HTTPS/middleware layer
