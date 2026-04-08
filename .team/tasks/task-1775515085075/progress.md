# HTTPS/LAN隧道安全访问

## Done
- Added `getLanIp()` in api.js, prints LAN IP on startup for HTTP and HTTPS modes
- HTTPS mode: binds on main port, HTTP→HTTPS redirect on port 3001
- Fallback to HTTP if cert generation fails
- HTTP redirect port conflict → logs warning, skips redirect
- Fixed browser open URL in bin/agentic-service.js to use correct protocol

