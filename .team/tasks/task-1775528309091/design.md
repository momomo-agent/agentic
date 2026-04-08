# Task Design: 添加 systemPrompt 支持

## Files to Modify
- `src/ask.ts` — verify `config.systemPrompt` is passed to `provider.chat()`
- `src/types.ts` — `systemPrompt?: string` already declared in `AgenticConfig`

## Current State
`ask.ts` line ~34: `provider.chat(messages, toolDefs, config.systemPrompt)` — already wired.
`Provider.chat()` signature: `chat(messages, tools, system?: string)` — already accepts it.

## Fix (if missing)
Ensure `config.systemPrompt` is passed as third argument to every `provider.chat()` call.

## Test Cases
1. `ask(prompt, { ...config, systemPrompt: 'You are a pirate' })` → provider receives `system: 'You are a pirate'`
2. No `systemPrompt` → provider receives `system: undefined`
