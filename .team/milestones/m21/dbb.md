# M21 DBB - Final Type & Docs Polish

## DBB-001: apiKey optional for custom provider
- Requirement: `AgenticConfig.apiKey` is optional when `provider='custom'`
- Given: `ask(prompt, { provider: 'custom', customProvider: fn })` called without `apiKey`
- Expect: no error thrown, agent loop runs, `customProvider` is invoked
- Verify: call completes successfully without any "apiKey required" error

## DBB-002: apiKey still required for anthropic provider
- Requirement: EXPECTED_DBB — missing/empty apiKey throws before network call for anthropic/openai
- Given: `ask(prompt, { provider: 'anthropic' })` called without `apiKey`
- Expect: throws an error before any network call is made
- Verify: error message references apiKey or authentication

## DBB-003: apiKey still required for openai provider
- Requirement: EXPECTED_DBB — missing/empty apiKey throws before network call for anthropic/openai
- Given: `ask(prompt, { provider: 'openai' })` called without `apiKey`
- Expect: throws an error before any network call is made
- Verify: error message references apiKey or authentication

## DBB-004: README documents images as required field
- Requirement: README shows `images: string[]` (required, not optional)
- Given: README.md `AgenticResult` type documentation
- Expect: `images` field shown as `images: string[]` (no `?`, no `| undefined`)
- Verify: README does not contain `images?: string[]`

## DBB-005: All existing tests pass
- Requirement: No regressions introduced
- Given: full test suite run after changes
- Expect: all tests pass with exit code 0
- Verify: test runner output shows 0 failures
