# Multi-device brain state sharing

## Progress

- Updated `broadcastSession` in hub.js to include session data (capped at last 20 messages), removes disconnected devices on send error
- Updated `POST /api/chat` in api.js to call `setSessionData` + `broadcastSession` after LLM response when `sessionId` is provided
