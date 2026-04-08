# M6: Custom Provider Bug Fix & Test Suite Recovery

## Critical Issue
**10 tests failing** due to a single bug in `src/providers/provider.ts:62-65`. The custom provider implementation requires `baseUrl` before checking for `config.customProvider`, breaking all tests that use mocked providers.

## Goals
1. **P0**: Fix custom provider to check `config.customProvider` first (task-1775530933189)
2. Verify images field implementation (task-1775530596867)
3. Verify apiKey validation implementation (task-1775530614268)

## Root Cause
```typescript
// Current (BROKEN):
case 'custom':
  if (!config.baseUrl) throw new Error('baseUrl is required when provider="custom"')
  // Never reaches customProvider check!

// Required Fix:
case 'custom':
  if (config.customProvider) return config.customProvider
  if (!config.baseUrl) throw new Error('baseUrl is required when provider="custom"')
```

## Acceptance Criteria
- All 26 tests pass (currently 16/26 passing)
- `config.customProvider` is used when provided
- `baseUrl` fallback works for OpenAI-compatible proxies
- Images and apiKey validation verified working

## Scope
3 tasks: 1 P0 bug fix + 2 verification tasks.
