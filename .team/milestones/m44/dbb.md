# M44 DBB — Ollama Auto-Install + npx Entrypoint + Multi-Device Brain State

## DBB-001: Ollama auto-install on missing binary
- Given: Ollama binary not found on PATH
- Expect: setup.js downloads and installs Ollama, then pulls recommended model with progress display
- Verify: Remove ollama from PATH, run `node src/cli/setup.js`, confirm binary installed and model pulled

## DBB-002: Model pull shows progress
- Given: Ollama installed but recommended model not present
- Expect: Progress bar/percentage displayed during model pull
- Verify: stdout shows pull progress (e.g. "Pulling gemma4:26b... 45%")

## DBB-003: npx agentic-service works on fresh machine
- Given: Fresh machine with Node.js, no global agentic-service install
- Expect: `npx agentic-service` starts service and opens browser
- Verify: `npx agentic-service` exits 0 after startup, `/api/status` responds 200

## DBB-004: Brain state syncs across devices
- Given: Two devices connected to hub.js
- Expect: Conversation context and active profile broadcast to all connected devices on update
- Verify: Connect two WebSocket clients, send chat on one, confirm other receives session broadcast
