# Test Result: hub.js设备命令 — speak/display支持

## Status: PASSED

## Tests: 4/4 passed

- DBB-004: sendCommand speak → device receives action:speak ✓
- DBB-005: sendCommand display → device receives action:display ✓
- DBB-006: sendCommand capture → returns Promise (no regression) ✓
- DBB-007: sendCommand fly → throws Unsupported command type ✓

## Implementation Verified
- SUPPORTED set `['capture', 'speak', 'display']` enforced
- speak/display payloads forwarded via `...rest`
- Unknown types throw synchronously before any send
