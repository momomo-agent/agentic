# hub.js设备命令: speak/display支持

## Progress

- Added `SUPPORTED = ['capture', 'speak', 'display']` check in `sendCommand`
- Throws `Unsupported command type: <type>` for unknown types before any send
- speak/display payloads forwarded via `...rest` — no structural change needed
- capture Promise behavior unchanged
