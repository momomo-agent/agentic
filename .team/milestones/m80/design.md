# M80: Wake Word Server Pipeline + Cross-Device Brain State — Technical Design

## Architecture

### Server-Side Wake Word Pipeline
**File:** `src/runtime/sense.js`

Replace stub with real implementation:
```javascript
async startWakeWordPipeline(callback) {
  // Use node-mic or similar to capture audio
  const mic = require('mic');
  const micInstance = mic({
    rate: '16000',
    channels: '1',
    encoding: 'signed-integer'
  });

  const micInputStream = micInstance.getAudioStream();

  micInputStream.on('data', async (data) => {
    // Process audio buffer for wake word
    const detected = await this.detectWakeWord(data);
    if (detected) {
      callback({ type: 'wakeword', confidence: detected.confidence });
    }
  });

  micInstance.start();
  return micInstance;
}
```

**Integration:** Wire to `src/server/hub.js` to trigger `brainChat()` on detection.

### Cross-Device Brain State Sharing
**File:** `src/server/hub.js`

Extend session management:
```javascript
// Store conversation history per session
this.sessions = new Map(); // sessionId -> { devices: Set, history: Message[] }

joinSession(deviceId, sessionId) {
  if (!this.sessions.has(sessionId)) {
    this.sessions.set(sessionId, { devices: new Set(), history: [] });
  }
  const session = this.sessions.get(sessionId);
  session.devices.add(deviceId);

  // Return full history to joining device
  return { sessionId, history: session.history };
}

broadcastSession(sessionId, message) {
  const session = this.sessions.get(sessionId);
  if (!session) return;

  // Add to history
  session.history.push(message);

  // Broadcast to all devices
  for (const deviceId of session.devices) {
    this.sendToDevice(deviceId, { type: 'message', data: message });
  }
}
```

## Dependencies
- `mic` package for audio capture
- WebSocket for real-time broadcast

## Testing
- Unit tests for wake word detection
- Integration tests for session history sharing
