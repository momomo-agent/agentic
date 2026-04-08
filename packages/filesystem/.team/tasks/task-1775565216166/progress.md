# Progress: Fix README performance table and scan() example

## Done
- Verified README.md performance table already has all required columns: Read (large), Storage Limit, Browser Support, Best For — all rows populated
- Verified scan() examples already use {path, line, content} signature — no stale examples found
- No changes needed; README already matches current spec

## DBB verification
- DBB-007: PASS — table has all four required columns with content for each row
- DBB-008: PASS — no scan() example missing `line` field
