# Design: README performance table — add missing columns

## File to Modify
- `README.md`

## Current State
README already has a complete performance table with columns:
- Read (small), Write (small), Read (large), Storage Limit, Browser Support, Best For

And separate sections:
- Browser Support Matrix table
- Storage Limits table (missing SQLiteBackend row)

## Gap
SQLiteBackend is missing from the Storage Limits table.

## Change
Add to Storage Limits table:
```
| SQLiteBackend | Disk space | Limited by filesystem, requires better-sqlite3 |
```

## Verification
After change, all 6 backends appear in all three tables:
1. Main performance table
2. Browser Support Matrix
3. Storage Limits
