# Fix cp without -r on directory

## Progress

Added directory guard in cp(): ls(src) check before read(src). Returns error if src is dir and no -r. 210 tests pass.
