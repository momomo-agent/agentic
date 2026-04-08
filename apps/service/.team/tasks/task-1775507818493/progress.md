# hub.js: 心跳超时修复为60s

## Progress

Already correct. Both `lastSeen > 60000` (line 13) and `lastPong > 60000` (line 116) use 60000ms. No changes needed.
