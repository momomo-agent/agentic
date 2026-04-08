# M23 DBB - Zero-Config Default Browser Filesystem

## DBB-001: Zero-config file_read/file_write
- Requirement: Zero-config filesystem (overview.md acceptance criteria #1)
- Given: `ask({ prompt: "write 'hello' to test.txt then read it back", apiKey: "..." })` with no `filesystem` field
- Expect: exit code 0, agent successfully writes and reads the file, answer reflects file contents
- Verify: No error thrown about missing filesystem

## DBB-002: Default filesystem is in-memory and browser-compatible
- Requirement: Default filesystem is browser-compatible (overview.md acceptance criteria #2)
- Given: The default filesystem is used (no `filesystem` passed)
- Expect: No Node.js `fs` module is required; implementation uses only in-memory storage
- Verify: Package can be imported in a browser environment without errors

## DBB-003: Explicit filesystem still works
- Requirement: Backward compatibility
- Given: `ask({ prompt: "...", apiKey: "...", filesystem: myCustomFs })`
- Expect: The provided `filesystem` is used, not the default
- Verify: file_read/file_write operations use the custom instance

## DBB-004: README documents filesystem as optional
- Requirement: README documents zero-config (overview.md acceptance criteria #3)
- Given: README.md is read
- Expect: README states `filesystem` is optional and a default is provided
- Verify: No example in README requires passing `filesystem` for basic file tool usage

## DBB-005: provider='custom' skips apiKey validation
- Requirement: EXPECTED_DBB — `provider='custom'` invokes `customProvider`, skips apiKey validation
- Given: `ask({ prompt: "...", provider: "custom", customProvider: myFn })` with no `apiKey`
- Expect: No error thrown about missing apiKey; `customProvider` is called
- Verify: Agent completes successfully without apiKey

## DBB-006: Missing apiKey throws for anthropic/openai before network call
- Requirement: EXPECTED_DBB — missing apiKey throws before network call
- Given: `ask({ prompt: "...", provider: "anthropic" })` with no `apiKey`
- Expect: Error thrown immediately, no network request made
- Verify: Error message references missing/empty apiKey
