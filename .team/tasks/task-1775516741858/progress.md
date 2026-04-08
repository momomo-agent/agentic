# Ollama自动安装 + 模型拉取

## Progress

- Created `src/detector/ollama.js` with `ensureOllama(model, onProgress)` export
- Detects existing install via `which ollama`, installs if missing (curl for darwin/linux, winget for win32)
- Streams `ollama pull` stdout to onProgress callback
- Throws descriptive errors on install/pull failure
