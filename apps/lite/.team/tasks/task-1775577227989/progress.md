# Make apiKey optional for custom provider in AgenticConfig

## Progress

- `src/types.ts`: `apiKey: string` → `apiKey?: string`
- `src/providers/anthropic.ts`: added early throw if `!config.apiKey`
- `src/providers/openai.ts`: added early throw if `!config.apiKey`
- custom provider with no apiKey works; anthropic/openai throw before network call
