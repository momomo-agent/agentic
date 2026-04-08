# Make AgenticConfig.apiKey optional for custom provider

## Progress

- Verified types.ts already has `apiKey?: string` (optional)
- Verified provider.ts already skips apiKey check for `provider='custom'`
- Updated README.md: Option 1 example now shows baseUrl without apiKey (clarifies it's optional)
- README already documented apiKey as optional for custom provider

## Status: Complete
