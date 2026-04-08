# DBB — m14: DBB Compliance Cleanup

## DBB-cp-001: cp on directory without -r returns error
- `exec('cp /dir /dest')` returns `'cp: /dir: is a directory (use -r)'`
- `exec('cp -r /dir /dest')` still performs recursive copy

## DBB-wc-001: wc default output uses tabs
- `exec('wc /file')` returns `'<lines>\t<words>\t<chars>\t<path>'`
- Fields separated by tabs, not spaces

## DBB-wc-003: wc on empty file returns `0 0 0`
- `exec('wc /empty')` returns `'0\t0\t0\t/empty'`
- Empty string has 0 lines, 0 words, 0 chars

## DBB-env-001: All test files execute in vitest run
- `vitest run` includes `src/index.test.ts` and `test/mkdir-find-cd.test.ts`
- No test files excluded except node_modules and dist
