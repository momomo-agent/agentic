# Design: npx 一键安装流程完善

## File to Modify

### `bin/agentic-service.js`

**Issue**: `runSetup()` in `src/cli/setup.js` already handles hardware detection, profile fetch, and Ollama setup. But the bin entry doesn't ensure browser opens after server starts, and model pull progress may not show % in all cases.

**Fix**: Ensure the full flow is wired correctly:

```js
// 1. Hardware detect + profile fetch (in runSetup)
// 2. Ollama check → if not installed, show install cmd + exit
// 3. Model pull with % progress (in optimizer.js pullModel callback)
// 4. Start server
// 5. Open browser unconditionally on first run (not gated by --no-browser for first run)
```

### `src/detector/optimizer.js` — `pullModel()`

Verify the progress callback receives `percent` and `speed` and that `spinner.text` updates are visible. The `pullModel` function must parse Ollama streaming pull response:

```js
// Ollama pull streams JSON lines: { status, completed, total }
// percent = Math.round((completed / total) * 100)
// Call: progressCallback(percent, `${speed}MB/s`)
```

### `src/cli/browser.js`

Verify `openBrowser(url)` uses platform-appropriate command:
- darwin: `open`
- linux: `xdg-open`  
- win32: `start`

## Edge Cases
- `total` may be 0 in early pull lines — guard: `total > 0 ? Math.round(completed/total*100) : 0`
- Browser open failure should not crash the process (wrap in try/catch)

## Test Cases
- Mock Ollama not installed → output contains install command, exit 0
- Mock pull stream → progress output shows increasing %
- Server starts → `openBrowser` called with `http://localhost:3000`
