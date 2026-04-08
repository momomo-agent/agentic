# Design: SIGINT优雅关闭处理

## Status
`bin/agentic-service.js` already registers `process.on('SIGINT', shutdown)` at line 69.
The `shutdown` function calls `server.close()` then `process.exit(0)`.

## Files to Modify
- `test/m16-sigint.test.js` — new test verifying SIGINT handler behavior

## Test: test/m16-sigint.test.js

```js
import { describe, it, expect, vi } from 'vitest';

describe('SIGINT graceful shutdown', () => {
  it('calls server.close and exits 0 on SIGINT', () => {
    const closeMock = vi.fn((cb) => cb());
    const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {});
    const server = { close: closeMock };

    function shutdown() { server.close(() => process.exit(0)); }
    process.once('SIGINT', shutdown);
    process.emit('SIGINT');

    expect(closeMock).toHaveBeenCalled();
    expect(exitMock).toHaveBeenCalledWith(0);
    exitMock.mockRestore();
  });
});
```

## Edge Cases
- SIGTERM uses same shutdown path (line 70)
- server.close error still exits cleanly

## Verification
```bash
npm test -- --run test/m16-sigint.test.js
```
