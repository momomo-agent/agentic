# Add apiKey validation in detectProvider

## Progress

Added format validation in `createProvider` (src/providers/provider.ts):
- anthropic: requires `sk-ant-` prefix
- openai: requires `sk-` prefix
- custom: skips all apiKey checks
