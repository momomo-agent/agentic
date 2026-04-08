# Task Design: Fix README AgenticResult.images type

## File to Modify
- `README.md` — find the `AgenticResult` type documentation block

## Change
Locate the line documenting `images` in the `AgenticResult` section and remove the `?`:

```
// Before
images?: string[]

// After
images: string[]
```

## Verification
- `grep 'images' README.md` must show `images: string[]` and NOT `images?: string[]`
- No other files need changes; this is a docs-only fix
