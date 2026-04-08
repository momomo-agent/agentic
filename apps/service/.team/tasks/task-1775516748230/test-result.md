# Test Result: 服务端唤醒词常驻pipeline

## Summary
- Tests: 3 passed, 0 failed

## Results
- ✅ returns a stop function
- ✅ stop function halts pipeline (second call returns no-op)
- ✅ multiple calls while active return no-op stop

## DBB Verification
- ✅ `startWakeWordPipeline` exported from `src/runtime/sense.js`
- ✅ Returns stop function
- ✅ Guard prevents multiple active pipelines
- ✅ SIGINT cleanup: stop function resets `_wakeActive` flag

## Edge Cases
- No mic: stub logs warning, returns no-op stop (handled)
- Multiple concurrent calls: second call returns no-op (handled)
