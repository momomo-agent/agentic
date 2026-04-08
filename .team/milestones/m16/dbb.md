# m16 — DBB (Definition of Branch-complete)

## Verification Criteria

### 1. grep -i works in all paths
- `shell.exec('grep -i hello file.txt')` matches lines with `Hello`, `HELLO`, `hello`
- `shell.exec('echo Hello | grep -i hello')` returns `Hello`
- `shell.exec('grep -r -i hello /')` matches case-insensitively across all files
- `shell.exec('grep -i hello *.txt')` (glob) matches case-insensitively

### 2. wc -l returns `<count> <filename>`
- `shell.exec('wc -l file.txt')` on 3-line file returns `3 file.txt`
- `shell.exec('wc -l empty.txt')` returns `0 empty.txt`
- `shell.exec('wc file.txt')` still returns full `lines words chars filename`

### 3. touch on existing empty file does not overwrite
- `touch` on existing file with content preserves content
- `touch` on existing empty file (`content === ''`) does not re-write
- `touch` on non-existent file creates it with empty content

### 4. Coverage gate enforced
- `pnpm test` (or `pnpm vitest run --coverage`) fails if statement coverage < 80%
- `pnpm test` fails if branch coverage < 75%
- Test count ≥ 148 (verified via test run output)
