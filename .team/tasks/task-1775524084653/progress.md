# Ollama non-200 fallback bug fix

## Progress

Added API key checks before emitting `meta` event in `chat()` fallback path (`src/runtime/llm.js`). Non-200 Ollama throw+catch was already correct; gap was misleading meta event emitted before key validation.
