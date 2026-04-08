# M93 Technical Design

## Overview
Three verification tasks closing PRD gaps around STT/TTS imports, wake word pipeline, and cloud fallback.

## Task Breakdown

### task-1775583805854: agentic-voice STT/TTS import resolution
- `agentic-voice` has no subpath exports — `import('agentic-voice/openai-whisper')` will fail at runtime
- Fix: update test mocks to mock the full module path, or add subpath stubs to the package
- Approach: mock at jest/vitest level using `vi.mock('agentic-voice/openai-whisper', ...)`

### task-1775583813340: Wake word pipeline verification
- `src/runtime/sense.js:startWakeWordPipeline()` already has real mic capture via `node-record-lpcm16`
- It gracefully degrades if the package is missing (try/catch + console.warn)
- Verification: confirm test covers both the happy path (mock recorder) and missing-dep path

### task-1775583813385: Cloud fallback + npx
- `src/runtime/llm.js:chat()` already implements OpenAI/Anthropic fallback when Ollama fails
- Test needs: mock `fetch` to fail for Ollama, succeed for OpenAI; assert chunks yielded
- npx: `bin/agentic-service.js` must handle `--help` flag and exit 0
