# Task Design: 修复 images 字段丢失

## Files to Modify
- `src/ask.ts`

## Problem
The final-response return at the top of the loop must include `allImages`. Looking at current `ask.ts`, line ~38 already returns `images: allImages`. This may already be fixed.

## Verification
In `ask.ts`, the return statement inside the loop:
```ts
return {
  answer: response.text,
  sources: allSources.length > 0 ? allSources : undefined,
  images: allImages,   // ← must be present
  ...
}
```

## Fix (if missing)
Add `images: allImages` to the return object in the final-response branch.

## Test Cases
1. Mock provider returns image URLs via search tool, then `end` → `result.images` contains those URLs
2. No images → `result.images` is `[]` (not undefined)
