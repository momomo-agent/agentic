# pipe 支持

## Progress

- Refactored `exec()` into `execSingle()` + pipe-aware `exec()`
- Added `execWithStdin()` for grep-on-stdin support
- Pipe splits on ` | `, chains output left-to-right
- Status: complete
