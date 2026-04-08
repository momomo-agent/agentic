# Vision Check — M80: Vision Gaps — Wake Word + Cross-Device Brain State

**Date:** 2026-04-07
**Match:** 72%

## Alignment

- Core runtime modules (LLM, STT, TTS, memory, sense adapters) are all wired — the agentic-* package integration is solid.
- Hardware detection + optimizer + profiles pipeline is implemented end-to-end.
- Admin UI and client voice UI cover the vision's UX requirements.
- HTTPS + hub device management partially covers multi-device connectivity.

## Divergence

- **Wake word (M80 primary goal):** `sense.js startWakeWordPipeline()` remains a stub. No real server-side mic/audio capture. The hub wires the `wakeword` event to `brainChat` but it never fires. This is the core gap M80 was created to fix — still unresolved.
- **Cross-device brain state (M80 secondary goal):** `joinSession`/`broadcastSession` exist in hub.js but shared brain state (conversation context, memory sync across devices) is minimal.
- **Voice latency <2s:** No benchmarking or enforcement in code. VAD server-side integration missing (M76).
- **LAN tunnel:** `tunnel.js` exists but completeness unverified.
- **Test suite:** 119 failing tests (M83 active) reduce confidence that implemented features work correctly.

## Recommendations for Next Milestone

1. **Complete wake word pipeline** — replace `startWakeWordPipeline()` stub with real audio capture (e.g. node-microphone or WebSocket audio stream from client).
2. **Cross-device brain state** — persist conversation context in agentic-store and sync on `joinSession` so all devices share the same memory.
3. **Latency benchmark** — add a simple e2e timing test for STT+LLM+TTS to enforce the <2s goal.
4. **Unblock M83** — failing tests must pass before vision features can be considered reliably implemented.
