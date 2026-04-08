# Design: Document custom provider fallback behavior

## What to document
When `provider='custom'`:
1. `customProvider` set → use it directly
2. `customProvider` absent + `baseUrl` set → `createOpenAIProvider(baseUrl, apiKey, model)`
3. Both absent → throw `Error('customProvider or baseUrl is required when provider="custom"')`

## Files to update
- `ARCHITECTURE.md` — add to "Provider Resolution / Custom Provider Fallback" section
- `README.md` — add usage example under custom provider docs

## Cannot modify directly
Submitted as CR to L2 (architect). See `.team/change-requests/`.
