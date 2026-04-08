# Fix grep -l stdin identifier

## Progress

- Changed `if (flags.includes('-l')) return ''` to `return lines.length ? '(stdin)' : ''` in execWithStdin
- Updated grep-case-insensitive.test.ts to expect '(stdin)' when match found
- All related tests pass
