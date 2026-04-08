# Test Result: DBB修复 — heartbeat 60s + wakeword广播 + SIGINT关闭

## Summary
- Total: 5 | Passed: 5 | Failed: 0

## Results
- ✅ DBB-001: device silent 61s → status offline (60s threshold verified)
- ✅ DBB-002: device with heartbeats stays online after 120s
- ✅ DBB-004: broadcastWakeword sends {type:'wakeword'} to all registry devices
- ✅ DBB-004: broadcastWakeword skips broken ws without throwing
- ✅ DBB-005: SIGINT handler registered via process.once('SIGINT')

## Test File
test/server/hub-m13.test.js
