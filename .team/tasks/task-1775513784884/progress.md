# sense.js服务端无头模式: 支持Node.js帧输入路径

## Progress

- Added `initHeadless(options)` export — creates pipeline without videoElement
- Added `detectFrame(buffer)` export — delegates to existing `detect()`, guards null buffer
- Existing browser API unchanged
