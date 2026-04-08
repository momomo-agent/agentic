# M14 Technical Design: Ollama自动安装 + 设备命令 + 硬件自适应 + README

## Overview

Four focused improvements to complete the service's operational readiness:

1. **Ollama auto-install** — `src/detector/optimizer.js`: execute install command with user confirmation instead of just printing it
2. **hub.js speak/display** — `src/server/hub.js`: add `speak` and `display` command types to `sendCommand`
3. **llm.js hardware-adaptive** — `src/runtime/llm.js`: replace hardcoded model with `optimizer.getProfile(hardware)` output
4. **README.md** — project root: install instructions + REST API docs

## Key Design Decisions

- Ollama install uses `child_process.spawn` (same as `pullModel`) for streaming output; user prompt via `readline`
- `sendCommand` already sends arbitrary fields via `{ type, ...rest }` spread — speak/display just need validation, no structural change
- `llm.js` already calls `getProfile(hardware)` via `profiles.js` — the issue is `optimizer.js` is not wired; `loadConfig` needs to call `optimizer.getProfile` directly
- README is a static doc file, no code changes needed

## File Touch List

| File | Change |
|------|--------|
| `src/detector/optimizer.js` | Add `executeInstall(platform)` + user prompt logic |
| `src/server/hub.js` | Add speak/display validation in `sendCommand` |
| `src/runtime/llm.js` | Import and call `optimizer.getProfile` in `loadConfig` |
| `README.md` | Create with install + API docs |
