# M87 DBB — Verification Criteria

## 1. agentic-sense External Package Wiring

- [ ] `package.json` has `"agentic-sense"` in `dependencies` (not just vendor path)
- [ ] `vitest.config.js` does NOT contain `'#agentic-sense'` alias
- [ ] `src/runtime/adapters/sense.js` imports directly from `'agentic-sense'` (no `#` prefix)
- [ ] No other source files reference `'#agentic-sense'`
- [ ] `npm test` passes all sense-related tests

## 2. ARCHITECTURE.md Documentation

- [ ] CR submitted to add: `tunnel` (src/tunnel.js), `CLI` (src/cli/), `HTTPS/middleware` (src/server/cert.js, httpsServer.js, middleware.js), `VAD` (src/runtime/vad.js), `embed` (src/runtime/embed.js)
- [ ] CR status is `pending` with correct schema

## 3. Architecture Match

- [ ] DBB architecture match >= 92%
