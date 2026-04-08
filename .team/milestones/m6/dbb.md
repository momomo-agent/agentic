# M6 DBB - Image Return Fix & Provider Validation

## DBB-001: images field populated in AgenticResult
- Requirement: `AgenticResult.images` contains all images collected during tool rounds
- Given: `ask()` is called and `web_search` tool returns images during any round
- Expect: Returned `AgenticResult.images` is a non-empty array containing those images
- Verify: Test asserts `result.images.length > 0` after a search that returns images

## DBB-002: images field is empty array (not undefined) when no images collected
- Requirement: `AgenticResult.images` is `[]` when no images were collected
- Given: `ask()` completes with no image-returning tool calls
- Expect: `result.images` equals `[]`
- Verify: Existing tests confirm `images` is always an array

## DBB-003: detectProvider throws on missing apiKey
- Requirement: Clear error when `apiKey` is absent and provider is not `custom`
- Given: `createProvider({ provider: 'anthropic' })` called without `apiKey`
- Expect: Throws `Error` with message containing `"apiKey is required"`
- Verify: Test asserts the thrown error message

## DBB-004: detectProvider throws on invalid apiKey format
- Requirement: Clear error when `apiKey` is present but wrong format for detected provider
- Given: `createProvider({ apiKey: 'bad-key' })` with no baseUrl
- Expect: Throws `Error` with message indicating invalid format
- Verify: Test asserts error is thrown with descriptive message

## DBB-005: All existing tests continue to pass
- Requirement: No regressions
- Given: Full test suite run after changes
- Expect: 0 failures
- Verify: Test runner exits with code 0
