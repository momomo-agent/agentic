# npx 一键安装流程完善

## Progress

- bin/agentic-service.js: Captured `isFirstRun` before setup runs; browser opens unconditionally on first run
- optimizer.js pullModel already parses % progress correctly — no changes needed
- browser.js already handles all platforms via `open` package with try/catch — no changes needed
