# Fix wc output format (tabs + filename)

## Progress

### src/index.ts (lines 794-796)
- Appended `\t${path}` to each single-flag return in `wc()`:
  - `-l`: `${lines}` → `${lines}\t${path}`
  - `-w`: `${words}` → `${words}\t${path}`
  - `-c`: `${chars}` → `${chars}\t${path}`

### src/index.test.ts (lines 671-687)
- Updated 3 test expectations from `'3'` to `'3\t/f.txt'`

### Verification
- `test/wc-flags-m16.test.ts`: 4/4 tests pass
- All other tests unaffected

### Notes
- Design line numbers slightly off (767-769 vs actual 794-769) but logic matched exactly
- No-flags default already returns tab-separated with filename — no change needed
