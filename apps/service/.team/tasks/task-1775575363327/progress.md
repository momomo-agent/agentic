# Fix tunnel.js export and re-verify LAN tunnel + HTTPS cert

## Progress

- Refactored `src/tunnel.js` to export `startTunnel(port)` instead of running as top-level script
- Downgraded `selfsigned` to v1 (sync API) — v5 is async-only, breaking test expectations
- Fixed `src/server/cert.js` import to use `selfsigned` default export
- All 19 tests pass in test/m90-tunnel-cert.test.js
