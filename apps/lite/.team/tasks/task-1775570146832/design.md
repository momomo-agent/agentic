# Design: Fix AgenticResult.images type to string[]

## Files to Modify
- `src/types.ts`

## Change
`AgenticResult.images` is already typed as `string[]` (required). Verify no `| undefined` exists and the field has no `?` modifier.

Current state (confirmed from source):
```ts
images: string[]
```

No code change needed — type is already correct. Task is a verification task.

## Test Cases
- TypeScript compilation passes: `tsc --noEmit`
- Confirm `images` field has no `?` and no `| undefined` in `AgenticResult`
