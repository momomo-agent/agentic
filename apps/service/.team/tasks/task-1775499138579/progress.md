# SIGINT 优雅关闭

## Progress

- bin/agentic-service.js: Added `shutdown()` helper with 5s force-exit timeout
- Added SIGTERM handler alongside SIGINT
