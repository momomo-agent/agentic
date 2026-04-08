# Ollama自动安装: setup.js执行安装命令

## Progress

- Added `createInterface` import from `node:readline`
- Replaced `promptInstallation` with `executeInstall(platform)` + `askConfirm` helper
- `setupOllama` now awaits `executeInstall`, re-detects after install, continues with model pull
- darwin: `brew install ollama`, linux: curl pipe sh, win32: print URL + exit 1
- User decline → `process.exit(1)`; install failure → throws → cloud fallback
