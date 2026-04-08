# M1 DBB Check

**Match: 72%** | 2026-04-06T21:06:17Z

## Pass
- hardware.js: all required fields present (platform, arch, gpu.type, gpu.vram, memory, cpu.cores, cpu.model)
- GPU detection: darwin/apple-silicon, linux/nvidia, none all handled in gpu-detector.js
- getProfile(hardware): matcher.js correctly scores and returns matching profile
- POST /api/chat: SSE stream implemented in api.js
- GET /api/status: returns hardware, profile, ollama, devices
- EADDRINUSE: startServer() rejects with "Port X is already in use"
- Ollama not installed: setup.js handles gracefully with install prompt
- Auto-opens browser: cli/browser.js present

## Partial
- CDN profiles fetch: profiles.js uses cdn.example.com but cache staleness (7-day) not confirmed
- Download progress: ora spinner used but % speed not shown
- Ctrl+C graceful shutdown: SIGINT handler in hub.js but full drain not confirmed
- Web UI: client/src/main.js exists but streaming/responsive not verified

## Missing
- No README.md at project root
