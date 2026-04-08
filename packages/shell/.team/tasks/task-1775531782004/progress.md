# rm -r 递归删除

## Status: complete

## Changes
- `src/index.ts`: replaced old `rm()` with `rmRecursive()` helper + new `rm()` implementation

## Implementation
- `rmRecursive(path)`: ls → recurse into dirs → delete files → delete self (depth-first)
- `rm(args)`: extracts `-r`/`-rf` flag, safety-checks `/`, dispatches to recursive or flat delete
- Non-recursive on a directory returns `rm: <path>: is a directory`
- Errors propagate via `fsError()`
