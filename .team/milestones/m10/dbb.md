# m10 DBB — PRD Compliance: code_exec & Custom Provider

## Verification Criteria

- [ ] `provider='custom'` with only `baseUrl` set (no `apiKey`, no `customProvider`) does not throw
- [ ] `provider='custom'` with `customProvider` hook still works as before
- [ ] `PRD.md` documents `code_exec` sandbox as quickjs-emscripten (not AsyncFunction eval)
- [ ] All existing tests pass (`pnpm test` green)
