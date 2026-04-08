# Technical Design — m14: DBB Compliance Cleanup

## Scope
Three targeted bug fixes in `src/index.ts` and one config change in `vitest.config.ts`.

## Changes

### 1. cp directory check (task-1775570877456)
In `cp()` at `src/index.ts:539`, before calling `fs.read()`, detect if src is a directory by attempting `fs.ls()`. If it succeeds and `-r` is not set, return the error message.

### 2. wc format + empty file (task-1775570891635)
In `wc()` at `src/index.ts:608`:
- Line count for empty string: `content === '' ? 0 : content.split('\n').length` 
- Default output already uses tabs (line 621 is correct) — verify no regression

### 3. vitest exclusions (task-1775570891676)
In `vitest.config.ts`, remove `'src/index.test.ts'` and `'test/mkdir-find-cd.test.ts'` from the `exclude` array.

## Risk
Removing test exclusions may expose pre-existing failures — developer should run suite and fix any failures found.
