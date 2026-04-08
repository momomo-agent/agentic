# Design: EXPECTED_DBB.md

## File to create
`EXPECTED_DBB.md` at project root

## Content
Global acceptance criteria covering all shipped features:
- Multi-round agent loop terminates correctly
- file tool uses AgenticFileSystem (browser-compatible)
- code tool uses AsyncFunction (browser-compatible)
- images field populated in AgenticResult
- systemPrompt passed to provider
- custom provider invoked when provider='custom'
- apiKey validation throws on missing/empty key
- package.json has publishConfig
- README has npm install instructions

## Test Cases
- File exists at `EXPECTED_DBB.md`
- File is non-empty with at least one verifiable criterion
