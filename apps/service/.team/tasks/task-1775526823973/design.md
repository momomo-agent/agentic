# Design: SIGINT graceful drain during in-flight requests

## File to modify
`bin/agentic-service.js`

## Change: track in-flight requests
Add middleware to `src/server/api.js` (or inline in startup):

```javascript
let inFlight = 0;
app.use((req, res, next) => {
  inFlight++;
  res.on('finish', () => inFlight--);
  res.on('close', () => inFlight--);
  next();
});
```

## Change: update shutdown() to drain
```javascript
function shutdown() {
  console.log(chalk.yellow('\n\nShutting down...'));
  const deadline = Date.now() + 10000;
  function tryExit() {
    if (inFlight === 0 || Date.now() >= deadline) {
      process.exit(0);
    } else {
      setTimeout(tryExit, 100);
    }
  }
  const closing = server.http ? [server.http, server.https] : [server];
  closing.forEach(s => s.close());
  tryExit();
}
```

## Edge cases
- Requests that never finish → force exit after 10s deadline
- `res.close` fires before `res.finish` (client disconnect) → counter still decremented

## Test cases
- No in-flight requests → exits immediately on SIGINT
- 1 in-flight request → waits for finish, then exits
- Request takes >10s → force exits at deadline
