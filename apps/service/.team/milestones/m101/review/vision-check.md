# M101 Vision Check — 引擎层贯通 (Completed)

**Match: 91%**

## Alignment

M101 successfully unified all capability routing through `engine/registry.js`, directly fulfilling the vision's core value of "能力发现与路由". Key achievements:

- `brain.js` now routes through `registry.resolveModel()` instead of internal resolution
- `stt.js` and `tts.js` resolve engines via `assignments` → registry, eliminating direct adapter selection
- Dead files removed (LocalModelsView.vue, CloudModelsView.vue, App-old.vue, ConfigPanel.vue, runtime/memory.js)
- Duplicate `/api/ollama/*` routes eliminated; unified under `/api/engines/*`
- Engine interface standardized: name, capabilities, status(), models(), run()

## Remaining Gaps

- **Visual perception** (major): sense.js adapter exists but MediaPipe detection requires browser runtime — server-side vision remains limited
- **Middleware** (minor): Still minimal error handler; no request validation or rate limiting. Acceptable for local-first architecture
- **OpenAI API compatibility** (major): Current endpoints work but aren't fully OpenAI-standard formatted. M102 will address this

## Recommendations for M102

- Registry unification from M101 provides the clean abstraction layer needed — M102 can add `/v1/embeddings`, `/v1/audio/transcriptions`, `/v1/audio/speech` as thin wrappers over registry dispatch
- Consider adding OpenAI-format response envelopes (choices array, usage object) to existing `/v1/chat/completions`
- The fallback chain (registry → next engine → error) is now in place; M102 should ensure standard error format across all endpoints
