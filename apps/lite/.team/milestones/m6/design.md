# M6 Technical Design: Image Return Fix & Provider Validation

## Overview
Two targeted fixes: ensure `allImages` is always returned in `ask.ts`, and add apiKey format validation in `detectProvider`.

## Task 1: Fix images field (task-1775530596867)

**File**: `src/ask.ts`

Looking at the current return statement in the final-response branch:
```ts
images: allImages,
```
This is already present in `ask.ts`. The issue may be that `allImages` is returned as `undefined` when empty vs `[]`. The fix is to ensure `allImages` is always returned (never conditionally omitted).

**Current code** (line ~38):
```ts
images: allImages,
```
This looks correct — `allImages` is initialized as `[]` and always returned. No change needed to `ask.ts` itself.

**Root cause re-check**: The task description says "omits images from the return value in the final-response branch." Looking at the code, `images: allImages` is present. The real issue may be in a prior version. Verify by running tests — if DBB-001/002 pass, no change needed.

If a fix IS needed, the change is:
- File: `src/ask.ts`
- Line: final return object
- Ensure: `images: allImages` (not `images: allImages.length > 0 ? allImages : undefined`)

## Task 2: apiKey validation (task-1775530614268)

**File**: `src/providers/provider.ts`

**Current `detectProvider`**:
```ts
function detectProvider(config: AgenticConfig): string {
  if (!config.apiKey) throw new Error('apiKey is required')
  if (config.baseUrl?.includes('anthropic')) return 'anthropic'
  if (config.apiKey?.startsWith('sk-ant-')) return 'anthropic'
  return 'openai'
}
```

**Problem**: Already throws on missing apiKey, but no format validation. `createProvider` also checks `!config.apiKey` redundantly.

**Fix**: Add format validation after provider is detected.

**Updated `createProvider`** signature (no change):
```ts
export function createProvider(config: AgenticConfig): Provider
```

**Updated `detectProvider`**:
```ts
function detectProvider(config: AgenticConfig): string {
  if (!config.apiKey) throw new Error('apiKey is required')
  if (config.baseUrl?.includes('anthropic')) return 'anthropic'
  if (config.apiKey.startsWith('sk-ant-')) return 'anthropic'
  return 'openai'
}
```

**Add format validation in `createProvider`** after provider is resolved:
```ts
if (provider === 'anthropic' && config.apiKey && !config.apiKey.startsWith('sk-ant-')) {
  throw new Error('Invalid apiKey format for anthropic provider (expected sk-ant- prefix)')
}
if (provider === 'openai' && config.apiKey && !config.apiKey.startsWith('sk-')) {
  throw new Error('Invalid apiKey format for openai provider (expected sk- prefix)')
}
```

**Edge cases**:
- `provider='custom'`: skip all apiKey checks (already handled)
- `baseUrl` override with non-matching key: validation runs after provider detection, so baseUrl-detected anthropic with non-`sk-ant-` key will throw — acceptable

## Test cases

### task-1775530596867
- `test/ask-images.test.ts` (new or existing): mock search returning `images: ['url1']`, assert `result.images` equals `['url1']`
- Assert `result.images` is `[]` when no images returned

### task-1775530614268
- `test/provider.test.ts` (new or existing):
  - `createProvider({ provider: 'anthropic', apiKey: 'bad' })` → throws with `'Invalid apiKey format'`
  - `createProvider({ provider: 'openai', apiKey: 'bad' })` → throws with `'Invalid apiKey format'`
  - `createProvider({ provider: 'anthropic', apiKey: 'sk-ant-abc' })` → no throw
  - `createProvider({})` → throws `'apiKey is required'`

## Dependencies
- No new packages
- Both fixes are isolated to `src/ask.ts` and `src/providers/provider.ts`
