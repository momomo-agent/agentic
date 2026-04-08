# Design: Fix README performance table missing columns

## Status
The README performance table at line 30 already contains all required columns:
- Read (large)
- Storage Limit
- Browser Support
- Best For

## Verification
Read README.md lines 28-50 and confirm the table header includes all 6 columns:
`| Backend | Read (small) | Write (small) | Read (large) | Storage Limit | Browser Support | Best For |`

## Task
If the table is already complete, mark task done. If any column is missing, add it to the table header and all rows.

## Files to modify
- `README.md` — performance table section (~line 30)

## Edge cases
- All 6 backend rows must have values for every column
- Notes section below table should reference any N/A values (e.g. LocalStorage large file read)
