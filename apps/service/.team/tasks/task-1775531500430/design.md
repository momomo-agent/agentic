# Task: Deepen cross-device brain state sharing in hub.js

## Objective
Extend `joinSession()` and `broadcastSession()` to share full LLM conversation context across devices, not just session ID. Devices joining an existing session should receive complete message history.

## Files to Modify

### 1. `src/server/hub.js`

**Data Structure:**
```javascript
class Hub {
  constructor() {
    this.sessions = new Map(); // sessionId -> SessionState
    this.devices = new Map();  // deviceId -> Device
  }
}

// SessionState structure
{
  id: string,
  devices: Set<string>,        // deviceIds in this session
  history: Message[],          // Full conversation history
  brainState: {
    context: string[],         // LLM context window
    systemPrompt: string,
    temperature: number
  },
  createdAt: number,
  lastActivity: number
}

// Message structure
{
  role: 'user' | 'assistant' | 'system',
  content: string,
  timestamp: number,
  deviceId: string
}
```

**Function:** `joinSession(deviceId, sessionId)`

```javascript
async joinSession(deviceId, sessionId) {
  // Create session if doesn't exist
  if (!this.sessions.has(sessionId)) {
    this.sessions.set(sessionId, {
      id: sessionId,
      devices: new Set(),
      history: [],
      brainState: {
        context: [],
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7
      },
      createdAt: Date.now(),
      lastActivity: Date.now()
    });
  }

  const session = this.sessions.get(sessionId);
  
  // Add device to session
  session.devices.add(deviceId);
  session.lastActivity = Date.now();

  // Update device mapping
  this.devices.set(deviceId, {
    id: deviceId,
    sessionId: sessionId,
    joinedAt: Date.now()
  });

  console.log(`[HUB] Device ${deviceId} joined session ${sessionId}`);

  // Return full session state to joining device
  return {
    sessionId: session.id,
    history: session.history,
    brainState: session.brainState,
    deviceCount: session.devices.size
  };
}
```

**Function:** `broadcastSession(sessionId, message)`

```javascript
async broadcastSession(sessionId, message) {
  const session = this.sessions.get(sessionId);
  if (!session) {
    console.warn(`[HUB] Session ${sessionId} not found`);
    return;
  }

  // Add message to history
  const messageWithMeta = {
    ...message,
    timestamp: Date.now(),
    sessionId: sessionId
  };
  
  session.history.push(messageWithMeta);
  session.lastActivity = Date.now();

  // Update brain state context
  if (message.role === 'user' || message.role === 'assistant') {
    session.brainState.context.push(message.content);
    
    // Keep context window manageable (last 20 messages)
    if (session.brainState.context.length > 20) {
      session.brainState.context = session.brainState.context.slice(-20);
    }
  }

  // Broadcast to all devices in session
  const broadcastPayload = {
    type: 'session-message',
    sessionId: sessionId,
    message: messageWithMeta,
    deviceCount: session.devices.size
  };

  for (const deviceId of session.devices) {
    await this.sendToDevice(deviceId, broadcastPayload);
  }

  console.log(`[HUB] Broadcasted to ${session.devices.size} devices in session ${sessionId}`);
}
```

**Function:** `sendToDevice(deviceId, payload)`

```javascript
async sendToDevice(deviceId, payload) {
  const device = this.devices.get(deviceId);
  if (!device || !device.ws) {
    console.warn(`[HUB] Device ${deviceId} not connected`);
    return;
  }

  try {
    device.ws.send(JSON.stringify(payload));
  } catch (error) {
    console.error(`[HUB] Failed to send to device ${deviceId}:`, error);
  }
}
```

**Function:** `leaveSession(deviceId)`

```javascript
async leaveSession(deviceId) {
  const device = this.devices.get(deviceId);
  if (!device) return;

  const sessionId = device.sessionId;
  const session = this.sessions.get(sessionId);
  
  if (session) {
    session.devices.delete(deviceId);
    
    // Clean up empty sessions after 5 minutes
    if (session.devices.size === 0) {
      setTimeout(() => {
        if (this.sessions.get(sessionId)?.devices.size === 0) {
          this.sessions.delete(sessionId);
          console.log(`[HUB] Cleaned up empty session ${sessionId}`);
        }
      }, 5 * 60 * 1000);
    }
  }

  this.devices.delete(deviceId);
  console.log(`[HUB] Device ${deviceId} left session ${sessionId}`);
}
```

### 2. `src/server/brain.js`

**Integration:** Use session history for LLM context

```javascript
async chat(sessionId, userMessage) {
  const session = this.hub.sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Build LLM messages from session history
  const messages = [
    { role: 'system', content: session.brainState.systemPrompt },
    ...session.history.map(m => ({
      role: m.role,
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ];

  // Call LLM
  const response = await this.llm.chat(messages, {
    temperature: session.brainState.temperature
  });

  // Broadcast both user message and assistant response
  await this.hub.broadcastSession(sessionId, {
    role: 'user',
    content: userMessage
  });

  await this.hub.broadcastSession(sessionId, {
    role: 'assistant',
    content: response
  });

  return response;
}
```

## Algorithm

1. Device calls `joinSession(deviceId, sessionId)`
2. Hub creates or retrieves session
3. Hub adds device to session's device set
4. Hub returns full history + brain state to device
5. When message sent, `broadcastSession()` adds to history
6. Hub broadcasts message to all devices in session
7. Each device receives synchronized state

## Edge Cases

- **Session doesn't exist:** Create new session with empty history
- **Device already in session:** Update last activity, return current state
- **Device disconnects:** Remove from session, clean up if last device
- **Large history:** Limit to last N messages to prevent memory issues
- **Concurrent updates:** Use proper locking or atomic operations

## Error Handling

- Validate sessionId and deviceId
- Handle WebSocket send failures gracefully
- Log all state changes for debugging
- Provide fallback if broadcast fails

## Dependencies

- WebSocket for real-time communication
- No additional npm packages needed

## Test Cases

1. **Unit test:** `joinSession()` creates new session
2. **Unit test:** `joinSession()` returns full history for existing session
3. **Unit test:** `broadcastSession()` adds message to history
4. **Unit test:** `broadcastSession()` sends to all devices
5. **Integration test:** Two devices join same session, verify shared history
6. **Integration test:** Device joins mid-conversation, receives full history
7. **E2E test:** Multi-device conversation synchronization

## Verification

```bash
# Run tests
npm test -- test/server/hub.test.js

# Manual test with curl
curl -X POST http://localhost:3000/api/session/join \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"device1","sessionId":"test-session"}'

# Verify response includes history array
```
