# Fix AgenticResult.images type to string[]

## Progress

Changed `images?: string[]` to `images: string[]` in src/types.ts. ask.ts already returns `images: allImages` unconditionally — no change needed. Pre-existing tsc errors are unrelated (missing agentic-filesystem declarations).
