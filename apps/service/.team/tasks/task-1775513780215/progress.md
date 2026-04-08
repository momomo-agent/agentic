# Ollama自动安装: setup.js检测并安装Ollama + 拉取推荐模型

## Progress

- Added `isOllamaInstalled()`, `isModelPulled()`, `getInstallCommand()` helpers to setup.js
- Updated `runSetup()` Ollama block to use new helpers directly
- Removed `setupOllama` import from optimizer.js
