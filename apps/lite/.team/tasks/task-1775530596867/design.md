# Technical Design: Fix images field lost in final return path

## File to modify
`src/ask.ts`

## Problem
`allImages` is initialized as `[]` and populated during tool rounds, but the return statement may conditionally omit it. Ensure it is always returned as-is (never `undefined`).

## Fix
In the final return object, change any conditional pattern:
```ts
// WRONG — omits images when empty
images: allImages.length > 0 ? allImages : undefined,

// CORRECT — always return the array
images: allImages,
```

The current code already has `images: allImages` — verify this is unconditional. If it is, no source change is needed and the task is a verification task.

## Function signature (no change)
```ts
export async function ask(prompt: string, config: AgenticConfig): Promise<AgenticResult>
```

## Edge cases
- No tool rounds executed: `allImages` is `[]`, returned as `[]`
- Multiple rounds with images: all pushed via `acc.allImages.push(...result.images)`, all present in return

## Test cases
- Mock `web_search` returning `images: ['http://img1.png']` → `result.images` equals `['http://img1.png']`
- Mock with no image-returning tools → `result.images` equals `[]`
