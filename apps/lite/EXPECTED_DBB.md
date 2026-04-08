# EXPECTED_DBB — Global Acceptance Criteria

- Multi-round agent loop terminates when `stopReason !== 'tool_use'`
- `file_read` / `file_write` use AgenticFileSystem (browser-compatible, no Node `fs`)
- `code_exec` uses AsyncFunction eval (browser-compatible, no `new Function` with Node deps)
- `AgenticResult.images` is populated from tool results (not silently dropped)
- `systemPrompt` is passed to provider `system` field when provided
- `provider='custom'` invokes `customProvider` hook, skips apiKey validation
- Missing or empty `apiKey` throws before any network call for anthropic/openai providers
- `package.json` contains `publishConfig: { access: "public" }`
- `README.md` contains `npm install agentic-lite`
