# M18 Done-By-Definition (DBB)

## DBB-001: wc tab-separated output
- `wc file` returns `2\t3\t10\t/file` (tabs, not spaces)
- `wc -l file` returns `2\t/file`
- `wc -w file` returns `3\t/file`
- `wc -c file` returns `10\t/file`

## DBB-002: unknown command exit code
- `exec('foobar')` returns `{ exitCode: 2 }`
- `exec('ls')` still returns `{ exitCode: 0 }`
- `exec('cat nonexistent')` still returns `{ exitCode: 1 }`

## DBB-003: mkdir .keep fallback
- When `fs.mkdir` is undefined, `mkdir /newdir` writes empty string to `/newdir/.keep`
- When `fs.mkdir` is undefined, `mkdir -p /a/b/c` writes `.keep` at each level
- When `fs.mkdir` is defined, native `fs.mkdir` is called (no .keep written)
