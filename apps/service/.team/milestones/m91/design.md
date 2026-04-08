# M91 Technical Design — Architecture Doc Sync + agentic-sense Completion

## Task 1: Submit CR for ARCHITECTURE.md gaps

Submit a CR JSON to `.team/change-requests/` documenting missing modules:
- `src/tunnel.js` — `startTunnel(port)` signature
- `src/cli/setup.js`, `src/cli/browser.js` — CLI module descriptions
- `src/server/cert.js`, `src/server/httpsServer.js`, `src/server/middleware.js`
- `src/runtime/vad.js` — `detectVoiceActivity(buffer)` signature
- agentic-embed usage in `src/runtime/memory.js`

No source code changes. CR only.

## Task 2: Verify agentic-sense wiring

Verification steps (read-only):
1. `grep -r '#agentic-sense' src/` — must return empty
2. `cat package.json | grep agentic-sense` — must show `file:./vendor/agentic-sense.tgz` in dependencies
3. `node -e "require('./src/runtime/sense.js')"` — must exit 0

If any check fails, escalate — developer task is incomplete.

## Task 3: Re-run test suite

Run `npm test`, capture pass/fail counts.
Pass rate = passing / total >= 0.90. Report exact numbers.
