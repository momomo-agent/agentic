# Explicit pagination and streaming unit tests

## Progress

Created `test/pagination-streaming.test.ts` with 7 passing tests:
- `pagination` describe: first page, second page, out-of-bounds, no-flag (all entries)
- `streaming grep` describe: readStream matches, no matches, fallback to read()

Note: Design specified `src/index.test.ts` but that file is excluded in vitest.config.ts. Tests placed in `test/` per project convention.
