# M21 Technical Design — Final Type & Docs Polish

## Scope
Two targeted fixes: make `apiKey` optional in `AgenticConfig` for custom providers, and correct the README `images` type annotation.

## Changes

### 1. `src/types.ts`
- Change `apiKey: string` → `apiKey?: string`
- Providers that require an API key (anthropic, openai) must validate it themselves and throw if missing

### 2. `README.md`
- Find the `AgenticResult` type table/block and change `images?: string[]` → `images: string[]`

## Validation
- Existing tests must pass (no regressions)
- DBB-001 through DBB-005 must all pass
