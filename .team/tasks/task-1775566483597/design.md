# Task Design — Document custom provider fallback behavior

## Objective
Document the undocumented fallback: when `provider='custom'` and `customProvider` is absent but `baseUrl` is set, `createProvider()` silently falls back to `createOpenAIProvider(config)`.

## File to Modify
- `ARCHITECTURE.md` — add fallback path to the custom provider section

## Change

In `ARCHITECTURE.md`, under **Key Interfaces** or a new **Provider Resolution** section, add:

```
### Custom Provider Fallback

When `provider='custom'`:
1. If `config.customProvider` is set → use it directly
2. Else if `config.baseUrl` is set → fall back to OpenAI-compatible adapter (`createOpenAIProvider`)
3. Else → throw `Error('customProvider or baseUrl is required when provider="custom"')`
```

## No Code Changes Required
The logic in `src/providers/provider.ts` (`createProvider`, `case 'custom'`) is already correct. This task is documentation-only.

## Verification
- ARCHITECTURE.md contains the three-step fallback rule for `provider='custom'`
- No source files are modified
