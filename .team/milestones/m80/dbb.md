# M80: Wake Word Server Pipeline + Cross-Device Brain State — DBB

## Definition of Done

### Server-Side Wake Word Pipeline
- [ ] `src/runtime/sense.js` implements `startWakeWordPipeline()` with real audio capture
- [ ] Wake word detection triggers `hub.js` `brainChat()` without client interaction
- [ ] Audio stream from microphone is processed for wake word detection
- [ ] Wake word event emitted to WebSocket clients when detected

### Cross-Device Brain State Sharing
- [ ] `src/server/hub.js` `joinSession()` shares full conversation context, not just session ID
- [ ] `broadcastSession()` propagates message history to all devices in session
- [ ] Devices joining existing session receive historical messages
- [ ] Brain state (conversation context) synchronized across all connected devices

## Verification Commands

```bash
# Test wake word pipeline
npm test -- test/runtime/sense.test.js

# Test cross-device state sharing
npm test -- test/server/hub.test.js

# Integration test
curl -X POST http://localhost:3000/api/session/join -d '{"sessionId":"test"}'
# Verify response includes conversation history
```

## Success Criteria
- Wake word detection works without client trigger
- Multiple devices in same session share conversation history
- All tests pass
