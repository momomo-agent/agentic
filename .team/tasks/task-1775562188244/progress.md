# grep streaming fallback indication

## Progress

Added warning in `grepStream()` fallback branch. Returns `[WARNING, ...matches]`. Updated caller in `grep()` to strip warning before `-c`/`-l` handling. Updated 5 tests. All 141 tests pass.
