# src/cli/ and unspecified server files — document or submit CR

## Progress

### Audit Results — No CR needed

**src/cli/**
- `browser.js` — `openBrowser(url)` opens browser after server starts
- `setup.js` — `runSetup()` first-run wizard: hardware detect, Ollama install, model pull, config save

**src/server/ (undocumented files)**
- `cert.js` — generates self-signed TLS cert via `selfsigned`
- `httpsServer.js` — wraps Express app in HTTPS using cert.js
- `middleware.js` — Express error handler (4-arg signature)

All files are legitimate supporting infrastructure. ARCHITECTURE.md covers core data-flow modules; these are CLI/HTTPS/error utilities. No design flaw — documentation gap only.
