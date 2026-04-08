# M18 Technical Design: DBB Compliance & Architecture Fixes

## Scope
3 targeted fixes in `src/index.ts`. No new files needed.

## 1. wc tab-separated output (task-1775576241453)
Change `wc()` return strings to use `\t` instead of spaces between fields.

## 2. unknown command exit code (task-1775576245522)
Change `exitCodeFor()` to return `2` for `command not found` instead of `127`.

## 3. mkdir .keep fallback (task-1775576251141)
Change `mkdirOne()` to write `path/.keep` with empty content when `fs.mkdir` is unavailable, instead of throwing.
