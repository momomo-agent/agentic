# Design: Fix images field silent loss

## File
`src/ask.ts`

## Problem
DBB-004 requires `images: []` (empty array) when no images returned, but current code returns `undefined`.

## Change
```ts
// Before
images: allImages.length > 0 ? allImages : undefined,
// After
images: allImages,
```

## Edge Cases
- No images → `[]`
- Images found → `['url1', ...]`

## Test Cases (DBB-003, DBB-004)
- Search returns images → `result.images` non-empty
- No images → `result.images === []`
