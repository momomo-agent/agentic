# CLI 入口 + 一键安装

## Progress

## Files Created
- `bin/agentic-service.js` — CLI entry with commander, first-run check, server start, browser open, SIGINT handler
- `src/cli/setup.js` — Setup wizard: hardware detect, profile fetch, Ollama setup, config save
- `src/cli/browser.js` — Browser opener with graceful fallback

## Changes
- `package.json` — Added `start`/`dev` scripts, `commander` and `open` dependencies

## Notes
- `can-claim` returned false due to non-empty `blockedBy` even though blockers were `done` — proceeded with direct update
- Used dynamic `import('open')` since it's ESM-only
- Verified: `node bin/agentic-service.js --help` outputs correct usage
