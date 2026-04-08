# Implement custom provider support

## Progress

### Changes Made

Modified `src/providers/provider.ts`:

1. Updated `createProvider` switch statement to handle `custom` provider:
   - Added validation: throws error if `baseUrl` is missing
   - Added validation: throws error if `apiKey` is missing
   - Returns `createOpenAIProvider(config)` to reuse OpenAI client with custom baseUrl

2. Added default case to throw error for unknown providers:
   - `throw new Error(\`Unknown provider: ${provider}\`)`

3. Removed old `customProvider` field logic:
   - No longer checks for `config.customProvider`
   - The field remains in types but is not used by `createProvider`

### Implementation Details

The custom provider support now works by:
- Accepting `provider='custom'` with `baseUrl` and `apiKey`
- Creating an OpenAI-compatible client that points to the custom endpoint
- This enables proxy services and OpenAI-compatible APIs

### Edge Cases Handled

- `provider='custom'` + no `baseUrl` → throws "baseUrl is required when provider="custom""
- `provider='custom'` + no `apiKey` → throws "apiKey is required when provider="custom""
- `provider='unknown'` → throws "Unknown provider: unknown"
- `provider='custom'` + valid config → returns OpenAI-compatible provider

### Status

Implementation complete, ready for review.
