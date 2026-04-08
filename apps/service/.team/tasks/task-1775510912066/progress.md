# 修复 src/detector/optimizer.js

## Progress

Verified: `optimizer.js` exports `setupOllama(profile)` with correct return shape. Handles install, model pull, win32, and error cases. No code changes needed.

## Completion
All optimizer-m14 tests pass (3/3). Timeout failures in optimizer.test.js are pre-existing (spawn real processes).
