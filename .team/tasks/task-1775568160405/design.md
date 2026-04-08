# Design: Fix ask() systemPrompt positional param

## Files to check
- `src/ask.ts` — current signature: `ask(prompt: string, config: AgenticConfig)`
- `src/types.ts` — `AgenticConfig.systemPrompt?: string`
- `ARCHITECTURE.md` — spec: `ask(prompt, config)`, systemPrompt in config

## Finding
Current implementation already matches the spec. `systemPrompt` is passed via `config.systemPrompt` and forwarded to `provider.chat(messages, toolDefs, config.systemPrompt)`. No positional param mismatch exists.

## Action
Verify alignment is documented. No code change required. If a discrepancy is found in any exported type or overload, remove it.

## Test cases
- `npm run build` passes
- Confirm `src/index.ts` exports `ask` with correct signature
