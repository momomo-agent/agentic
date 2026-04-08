# M25 Technical Design

## task-1775513780215: Ollama自动安装

Extend `src/cli/setup.js` `runSetup()` to detect and install Ollama before model pull.

Key change: replace current `setupOllama()` call with inline detection + install + pull logic that handles the "not installed" case explicitly.

## task-1775513784884: sense.js服务端无头模式

Add headless path to `src/runtime/sense.js` alongside existing browser path.

Key change: `initHeadless()` skips videoElement; `detectFrame(buffer)` calls `pipeline.detect(buffer)` directly without interval/DOM dependency.
