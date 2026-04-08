# Milestone 8 — Command Completeness & Documentation

## Goals
Close remaining architecture and DBB gaps: directory-aware mv/cp, echo redirection, ls hidden files, explicit pagination/streaming tests, and ARCHITECTURE.md.

## Scope
- `cp -r`: recursive directory copy
- `echo` redirection: `>` and `>>` operators
- `mv` directory support: handle directory moves (not just files)
- `ls -a` dotfiles: surface real hidden files from filesystem
- Explicit pagination/streaming unit tests (DBB-007 compliance)
- `ARCHITECTURE.md`: formalize design decisions

## Acceptance Criteria
- `cp -r /src /dst` copies directory trees recursively
- `echo foo > file.txt` and `echo foo >> file.txt` work
- `mv /dir /newdir` succeeds without read-content error
- `ls -a /dir` returns actual dotfiles from fs adapter
- Dedicated test cases for `--page`/`--page-size` and `grepStream()`
- `ARCHITECTURE.md` exists at repo root with design decisions documented
