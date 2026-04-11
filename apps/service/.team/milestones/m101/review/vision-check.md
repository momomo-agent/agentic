# M101 Vision Check — 引擎层贯通

**Match: 91%**

## Alignment

M101 targets unifying all capability routing through `engine/registry.js`. This aligns well with the vision's core value of "能力发现与路由" — the registry is the backbone for routing chat/vision/stt/tts/embedding to the right engine.

Current state:
- `engine/registry.js` exists and provides engine registration
- `engine/init.js` orchestrates ollama, whisper, tts, cloud engines
- `server/brain.js` handles LLM routing with cloud fallback
- `runtime/stt.js` and `runtime/tts.js` wire through voice adapters

## Divergence

- brain.js and stt/tts still have their own routing logic rather than going through a single registry dispatch. M101 aims to consolidate this.
- The middleware gap (no rate limiting, validation) becomes more relevant as the API surface grows through registry unification.

## Recommendations for M102

- Once M101 unifies routing through registry, M102 (OpenAI-compatible API) should be straightforward — the registry provides the abstraction layer needed for standard endpoints.
- Ensure `/v1/audio/transcriptions`, `/v1/audio/speech`, `/v1/embeddings` all route through the unified registry before adding OpenAI-format wrappers.
