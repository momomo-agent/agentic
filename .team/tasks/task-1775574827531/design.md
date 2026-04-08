# Design: Fix README custom storage scan() signature example

## Status
README.md line 173 already shows the correct signature:
`async scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>> { /* ... */ }`

## Task
Verify line ~173 has `line: number` in the return type. If it shows the old `{path, content}[]` without `line`, update it.

## Files to modify
- `README.md` — Custom Storage Backend section (~line 173)

## Change (if needed)
Old: `Promise<Array<{ path: string; content: string }>>`
New: `Promise<Array<{ path: string; line: number; content: string }>>`
