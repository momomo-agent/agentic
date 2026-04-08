# 服务器层实现 hub.js + brain.js + api.js

## Progress

## Complete
- hub.js: added `register(ws, deviceInfo)` + `broadcast(event, data)`, ws close handler, kept backward-compat exports
- brain.js: already implemented (async generator tool-call loop + cloud fallback)
- api.js: already implemented (createApp factory, all routes, static serving)
