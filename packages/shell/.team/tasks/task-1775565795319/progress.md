# grep error propagation on missing directory

## Progress

- Fixed `src/index.ts`: when `fs.ls()` throws, return UNIX error immediately (no fallthrough to `fs.read()`)
- Added 2 tests in `src/index.test.ts`: non-existent dir → error, empty dir → ''
- All 167 tests pass
