# M90: Vision & PRD Gap Closure — Wake Word, Cloud Fallback, LAN Tunnel

## Goals
Close remaining partial gaps in vision (72%) and PRD (78%) that are still unverified or incomplete.

## Scope
1. Verify and complete wake word server-side pipeline (sense.js startWakeWordPipeline stub)
2. Verify cloud fallback (OpenAI/Anthropic) in llm.js/brain.js is fully functional
3. Verify LAN tunnel (tunnel.js) completeness and HTTPS cert generation
4. Verify npx one-command startup end-to-end

## Acceptance Criteria
- Wake word pipeline triggers on audio input (not a stub)
- Cloud fallback activates when local Ollama unavailable
- LAN tunnel establishes HTTPS connection on local network
- `npx agentic-service` starts server without errors
