# M25: Ollama自动安装 + 服务端感知路径

## Goals
- Ollama binary auto-install and model pull on first run
- Server-side headless camera path for sense.js (Node.js compatible)

## Acceptance Criteria
- `setup.js` detects missing Ollama and runs install command automatically
- Recommended model pulled via `ollama pull` after install
- `sense.js` supports headless/server-side frame input (no browser dependency)

## Scope
- PRD gap: Ollama auto-install (missing)
- Vision gap: sense.js server-side headless camera path (partial)
