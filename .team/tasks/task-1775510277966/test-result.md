# Test Result: task-1775510277966 — 实现 src/server/hub.js

## Summary
- Total tests: 5
- Passed: 5
- Failed: 0

## Test Results (test/m19-hub.test.js)
- ✅ register → getDevices includes device
- ✅ updateStatus → device.status updated
- ✅ updateStatus unknown id → throws with correct message
- ✅ register twice → device still exists
- ✅ getDevices returns array

## Edge Cases
- Double registration preserves existing device entry
- updateStatus with unknown id throws `Device not found: <id>`

## Verdict: PASS
