# Test Result: server/hub.js 设备管理

## Summary
- Total: 7 | Passed: 7 | Failed: 0

## Results
- ✔ registerDevice returns { id, registeredAt }
- ✔ getDevices includes registered device with online status
- ✔ heartbeat on unknown id auto-registers device
- ✔ heartbeat updates lastSeen and sets status online
- ✔ device starts online after registration
- ✔ device marked offline when lastSeen > 30s ago (threshold logic verified)
- ✔ heartbeat resets status to online with recent lastSeen

## DBB-001 Verification
- ✅ registerDevice(id, meta) → { id, registeredAt }
- ✅ heartbeat(id) updates lastSeen, auto-registers unknown ids
- ✅ getDevices() returns all devices with status
- ✅ Offline threshold: >30s → offline

## Result: PASS
