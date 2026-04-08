# Document tunnel, CLI, VAD, HTTPS modules in ARCHITECTURE.md

## Progress

### Completed
- Read existing ARCHITECTURE.md structure
- Appended 4 new sections as specified in design.md:
  - Section 5: Tunnel (LAN/WAN Exposure) - documents src/tunnel.js
  - Section 6: CLI Modules - documents src/cli/setup.js and src/cli/browser.js
  - Section 7: VAD (Voice Activity Detection) - documents src/runtime/vad.js
  - Section 8: HTTPS & Middleware - documents src/server/cert.js, httpsServer.js, middleware.js
- Verified with grep: 4 keyword matches (tunnel, VAD, cli/setup, httpsServer)

### Implementation Notes
- Followed the exact format from design.md
- Maintained consistent code block style with existing sections
- All sections properly numbered and formatted
