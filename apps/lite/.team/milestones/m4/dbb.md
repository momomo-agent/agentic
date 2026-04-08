# M4 Done-By-Definition (DBB)

## Verification Criteria

1. `ask.ts` loops up to `MAX_TOOL_ROUNDS` before throwing; does NOT return after the first tool round
2. `AgenticResult.images` is populated in all code paths including the final-response branch
3. `AgenticConfig.systemPrompt` is passed to `provider.chat()` as the `system` argument
4. `createProvider()` with `provider='custom'` uses `config.customProvider`; throws `Error('customProvider required when provider="custom"')` if missing
5. All four tasks have passing tests
