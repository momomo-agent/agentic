# 云端 LLM 回退

## Progress

- Added `chatWithAnthropic()` streaming generator
- Updated `chat()` fallback routing: openai + anthropic + unknown provider error
- Yields `{ type: 'meta', provider: 'cloud' }` before cloud delegation
