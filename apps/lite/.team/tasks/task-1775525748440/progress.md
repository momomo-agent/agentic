# 添加 system prompt 支持

## Progress

- Added `systemPrompt?: string` to `AgenticConfig` in `src/types.ts`
- Updated `Provider.chat()` signature to accept `system?: string` in `src/providers/provider.ts`
- Anthropic provider: passes `system` as top-level field when set
- OpenAI provider: prepends `{ role: 'system', content: system }` to messages when set
- `ask.ts`: passes `config.systemPrompt` to `provider.chat()`
