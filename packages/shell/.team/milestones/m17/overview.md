# m17 — Glob Expansion, cp Error & Input Redirection

## Goals
Address remaining architecture and vision gaps after m16.

## Scope
1. Glob pattern support (`*`, `?`, `[]`) in command arguments (vision gap)
2. `cp` without `-r` on directory: return error instead of falling through (dbb gap)
3. Input redirection `<` implementation (architecture gap)

## Acceptance Criteria
- `ls *.ts` expands glob and lists matching files
- `cp dir/ dest` returns `cp: dir/: is a directory` without `-r`
- `cat < file.txt` reads file via stdin redirection
- All new behaviour covered by tests

## Blocked By
m16 must be completed first (coverage gate must pass before adding new features).
