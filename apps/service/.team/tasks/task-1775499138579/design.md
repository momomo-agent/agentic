# Design: SIGINT 优雅关闭

## File to Modify

### `bin/agentic-service.js`

**Issue**: SIGINT handler exists but only calls `server.close()`. If server has open connections, close() may hang. Also missing SIGTERM handler.

**Fix**: Add timeout to force-exit if close takes too long, and handle SIGTERM:

```js
function shutdown(server) {
  console.log(chalk.yellow('\n\nShutting down...'));
  server.close(() => {
    console.log(chalk.green('✓ Server closed'));
    process.exit(0);
  });
  // Force exit after 5s if connections linger
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown(server));
process.on('SIGTERM', () => shutdown(server));
```

## Edge Cases
- Open WebSocket connections may prevent `server.close()` from completing — timeout ensures exit
- `setTimeout(...).unref()` prevents the timer from keeping the process alive if close succeeds first

## Test Cases
- Send SIGINT → process exits with code 0, logs "Server closed"
- Send SIGTERM → same behavior
- Open connection during shutdown → process still exits within 5s
