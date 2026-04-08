# M64: Architecture Compliance — agentic-store + agentic-embed Package Verification

## Goal
Verify `src/store/index.js` and `src/runtime/embed.js` wrap external packages per architecture spec.

## Acceptance Criteria
- `package.json` lists `agentic-store` and `agentic-embed` as dependencies
- `src/store/index.js` imports from `agentic-store` (not local impl)
- `src/runtime/embed.js` imports from `agentic-embed` (not local impl)
- `src/detector/matcher.js` and `src/detector/ollama.js` documented or removed
