# m10 Technical Design — PRD Compliance: code_exec & Custom Provider

## Tasks

1. Fix `provider='custom'` apiKey validation in `src/providers/provider.ts`
2. Update `PRD.md` to document quickjs-emscripten as the code_exec sandbox

## Approach

### Task 1: Custom Provider apiKey Fix
- In `src/providers/provider.ts`, the `custom` case currently throws if `!config.apiKey`
- Remove that check — when `baseUrl` is set without `apiKey`, pass through to `createOpenAIProvider` which will use the baseUrl without auth
- The top-level guard `if (provider !== 'custom' && !config.apiKey)` already correctly skips custom

### Task 2: PRD code_exec Sandbox Alignment
- `PRD.md` currently says AsyncFunction eval; implementation uses quickjs-emscripten
- Update PRD.md `code_exec` description to reflect quickjs-emscripten isolated sandbox
