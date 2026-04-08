# 添加 systemPrompt 支持

## Progress

## Findings
- `AgenticConfig.systemPrompt?: string` already declared in `src/types.ts:12`
- `ask.ts:27` already passes `config.systemPrompt` to `provider.chat()`
- All providers accept `system?: string` as third param
- No code changes needed — implementation is complete and correct as-is

