# M7 Done-By-Definition (DBB)

## Verification Criteria

### 1. grep streaming fallback indication
- [ ] When `fs.readStream` is absent, grep output includes `# note: streaming unavailable, using read()` before results
- [ ] When `fs.readStream` is present, no fallback note appears
- [ ] Existing grep tests still pass

### 2. AgenticFileSystem streaming interface type safety
- [ ] Interface declares `readStream?(path: string): AsyncIterable<string>` as optional typed method
- [ ] The `(this.fs as any)` cast in `grepStream` is removed
- [ ] `tsc --noEmit` passes with no new errors

### 3. fs adapter contract validation at shell init
- [ ] Constructor throws `Error` listing missing methods when required methods (`read`, `write`, `ls`, `delete`, `grep`) are absent
- [ ] Valid adapters construct without error
- [ ] Test covers the throw case

### Regression Gate
- [ ] All pre-existing tests pass (`pnpm test`)
- [ ] No new TypeScript errors
