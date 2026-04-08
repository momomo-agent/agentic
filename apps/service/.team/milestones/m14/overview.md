# M14: Ollama自动安装 + 设备命令 + 硬件自适应 + README

## Goals
Close remaining PRD (68%) and vision (78%) gaps.

## Scope
1. Ollama auto-execute install — setup.js actually runs install command, not just prints it
2. Device speak/display commands — hub.js sendCommand supports speak/display in addition to capture
3. Hardware-adaptive model wiring — llm.js loadConfig() uses optimizer output, not hardcoded gemma4:26b
4. README.md — install instructions + REST API docs at project root

## Acceptance Criteria
- `setup.js` detects missing Ollama and auto-executes install (with user prompt)
- `hub.js` handles `speak` and `display` command types via sendCommand
- `llm.js` calls `optimizer.getProfile(hardware)` to select model dynamically
- `README.md` exists with npx/global/docker install steps and API endpoint docs

## Out of Scope
- sense.js browser-only issue (requires agentic-sense package change — CR needed)
- CDN URL (cdn.example.com vs jsdelivr — requires PRD update)
