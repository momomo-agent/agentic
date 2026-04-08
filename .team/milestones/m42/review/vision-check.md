# Vision Check — M42: Wake Word + Voice Latency + HTTPS

**Match: 75%**
**Timestamp: 2026-04-07T01:41:42Z**

## Alignment

- HTTPS: `httpsServer.js` + `cert.js` exist — self-signed cert path implemented. Aligns with vision goal of secure multi-device access.
- Wake word broadcast: `hub.js` wires `wakeword` event to `brainChat` and broadcasts response to all devices. Architecture is correct.
- Multi-device hub: WebSocket registry, session management, and device heartbeat all solid.

## Divergence

- **Wake word stub**: `sense.js#startWakeWordPipeline()` is a no-op stub — logs a warning and returns immediately. The server-side always-on wake word pipeline never actually fires. This is the critical gap for M42.
- **Voice latency**: No timing instrumentation exists in the STT→LLM→TTS chain. The <2s success criterion cannot be verified.
- **LAN tunnel**: Vision calls for multi-device connectivity via HTTPS/intranet tunneling. HTTPS is partial; no tunnel (ngrok/cloudflare) implemented.

## Recommendations for M43+

1. **M43 priority**: Replace `startWakeWordPipeline` stub with a real mic-capture implementation (e.g. `node-microphone` + keyword spotting, or pipe from `agentic-voice`).
2. Add latency timing middleware in `brain.js` to measure and log STT+LLM+TTS round-trip; gate on <2s.
3. Consider mDNS/Bonjour for LAN discovery as a simpler alternative to full tunnel setup.
