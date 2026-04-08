# Fix wc tab-separated output

## Progress

- Fixed wc() in src/index.ts:657-660: replaced space separators with `\t` in all return paths (-l, -w, -c, default)
