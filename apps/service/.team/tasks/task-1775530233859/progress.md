# LAN tunnel via ngrok or cloudflare

## Progress

### Completed
- Created `src/tunnel.js` with ngrok/cloudflared detection and spawning logic
- Added `"tunnel": "node src/tunnel.js"` script to package.json
- Implemented PORT env var support (defaults to 3000)
- Added SIGINT handler for clean shutdown
- Error handling for missing tunnel tools with install links

### Implementation Details
- Checks for ngrok first, then cloudflared
- Uses `which` command to detect installed tools
- Spawns tunnel process with stdio: 'inherit' so URLs print to console
- Clean exit on Ctrl+C

### Status
Implementation complete. Ready for review.
