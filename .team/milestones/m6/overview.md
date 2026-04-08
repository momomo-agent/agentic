# M6: Command Completeness — Round 3

## Goals
Close remaining vision gaps: mv directory support, cp -r recursive copy, ls -a real dotfiles, echo redirection.

## Scope
- mv: support directory moves (not just files)
- cp -r: recursive directory copy
- ls -a: surface real hidden dotfiles from filesystem (not just synthetic . and ..)
- echo: output redirection (> and >>)

## Acceptance Criteria
- `mv dir1 dir2` moves directory and all contents
- `cp -r src dst` recursively copies directory tree
- `ls -a` lists actual dotfiles from fs adapter
- `echo hello > file.txt` writes to file; `echo world >> file.txt` appends
- All new behaviors covered by tests
