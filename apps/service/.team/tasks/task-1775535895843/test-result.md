# Test Result: Fix WebSocket disconnect — remove device from registry

## Task
Fix WebSocket disconnect — remove device from registry

## Test Execution Summary
- **Total Tests**: 7 (in ws-hub.test.js)
- **Passed**: 7
- **Failed**: 0
- **Status**: DONE - All tests passing

## Test Results

### All Tests Passing (7/7)
1. ✓ sendCommand throws for unknown device
2. ✓ unregisterDevice rejects pending capture
3. ✓ register → registered + appears in getDevices()
4. ✓ ping → pong
5. ✓ sendCommand speak → device receives command
6. ✓ sendCommand capture → resolves with data
7. ✓ **disconnect removes device from registry** ← Target test for this task

## Implementation Verification

The implementation in `src/server/hub.js` is correct:

**Line 231**: WebSocket close handler
```js
ws.on('close', () => { if (deviceId) unregisterDevice(deviceId); });
```

**Lines 147-157**: `unregisterDevice()` function
```js
export function unregisterDevice(id) {
  leaveSession(id);
  registry.delete(id);        // ← Removes from registry
  devices.delete(id);          // ← Removes from devices map
  for (const [reqId, pending] of pendingCaptures) {
    if (pending.deviceId === id) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Device disconnected'));
      pendingCaptures.delete(reqId);
    }
  }
}
```

**Test verification** (lines 96-103 in test/server/ws-hub.test.js):
```js
it('disconnect removes device from registry', async () => {
  const ws = await connect();
  ws.send(JSON.stringify({ type: 'register', id: 'ws-4', name: 'X', capabilities: [] }));
  await nextMsg(ws);
  ws.close();
  await new Promise(r => setTimeout(r, 50));  // Wait for async close handler
  expect(getDevices().find(d => d.id === 'ws-4')).toBeUndefined();
});
```

The test correctly:
1. Registers a device
2. Closes the WebSocket connection
3. Waits 50ms for the async close handler to execute
4. Verifies the device is no longer in the registry

## DBB Verification

From `.team/milestones/m83/dbb.md`:
- **Criterion 2**: "WebSocket disconnect — hub disconnect test passes: device removed from registry after ws.close()"
- **Status**: ✓ PASS

## Edge Cases Verified

1. ✓ Device removed from registry on disconnect
2. ✓ Device removed from devices map on disconnect
3. ✓ Pending capture requests rejected with "Device disconnected" error
4. ✓ Close handler only runs if deviceId exists (guard: `if (deviceId)`)
5. ✓ Error event also triggers cleanup (line 232)

## Test Coverage

The test suite comprehensively covers:
- Device registration and unregistration
- WebSocket protocol (ping/pong, commands)
- Disconnect cleanup
- Pending request rejection on disconnect

All 7 tests in the WebSocket integration test suite pass.

## Conclusion

The implementation is correct and all tests pass. The fix was already in place - the close handler properly calls `unregisterDevice()` which removes the device from the registry. The test includes the necessary 50ms delay to allow the async close handler to complete before asserting.

**Status**: DONE ✓
