# cd 路径验证

## Status: complete

## Changes
- `src/index.ts`: `cd()` changed to `async`, added `fs.ls()` + `fs.read()` validation

## Implementation
- ls throws → "No such file or directory"
- read succeeds (has content) → "Not a directory"
- Otherwise update cwd
