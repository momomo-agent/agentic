# M7 DBB Check

**Match: 73%** | 2026-04-06T21:06:17Z

## Pass
- llm.js: Ollama timeout falls back to cloud (openai/anthropic)
- ANTHROPIC_API_KEY: chatWithAnthropic() implemented
- No API key: throws "OPENAI_API_KEY not set" / "ANTHROPIC_API_KEY not set"
- WebSocket: register/ping/pong/heartbeat all in hub.js
- 60s no heartbeat: registry cleanup interval at 30s checks lastPong >60000ms
- speak/display/capture: sendCommand() supports all three, throws on unknown type
- tool_use response: brain.js yields {type:'tool_use', text:'', ...}

## Partial
- SIGINT: hub.js process.once('SIGINT') closes wss but HTTP server drain not confirmed
- CDN URL: profiles.js uses cdn.example.com but live accessibility not verified
- Model pull progress: ora spinner used but % not shown
- README: no README.md found at project root
