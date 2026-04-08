# Design: Document tunnel, CLI, VAD, HTTPS modules in ARCHITECTURE.md

## File to Modify
- `ARCHITECTURE.md` — append new sections after existing content

## Sections to Add

### tunnel.js
```
## 5. Tunnel (LAN/WAN Exposure)
// src/tunnel.js
// Spawns ngrok or cloudflared to expose local port externally
// Prefers ngrok if installed, falls back to cloudflared
// Handles SIGINT to kill subprocess cleanly
startTunnel(port: number) → void
```

### src/cli/
```
## 6. CLI Modules
// src/cli/setup.js — first-run wizard: detect hardware, pull profile, install Ollama, pull model
// src/cli/browser.js — open browser to http://localhost:<port> after server starts
```

### runtime/vad.js
```
## 7. VAD (Voice Activity Detection)
// src/runtime/vad.js
detectVoiceActivity(buffer: Buffer) → boolean
// RMS energy threshold (0.01). Returns true if audio contains speech.
```

### HTTPS/middleware
```
## 8. HTTPS & Middleware
// src/server/cert.js — generates self-signed cert via selfsigned
// src/server/httpsServer.js — createServer(app) → https.Server
// src/server/middleware.js — errorHandler(err, req, res, next) → void
```

## Verification
- `grep -c "tunnel\|VAD\|cli/setup\|httpsServer" ARCHITECTURE.md` returns ≥4
