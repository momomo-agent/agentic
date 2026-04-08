# DBB Check — m17

**Timestamp:** 2026-04-07T15:35:05.248Z
**Match:** 90%

## Summary

m17 adds glob expansion for `cat`, `rm`, `cp`, fixes `cp` directory error message, and verifies input redirection. All core implementation criteria pass. Two criteria are partial due to inability to run tests without execution environment.

## Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `ls *.ts` returns matching files | pass | `expandGlob()` in `ls()` — src/index.ts:255 |
| `cat *.txt` concatenates matching files | pass | `expandPathArgs()` in `cat()` — src/index.ts:290; test in test/glob-expansion-m17.test.ts:17 |
| `rm *.log` removes matching files | pass | `expandPathArgs()` in `rm()` — src/index.ts:496; test in test/glob-expansion-m17.test.ts:47 |
| `cp *.md /dest/` copies matching files | pass | glob branch in `cp()` — src/index.ts:571; test in test/glob-expansion-m17.test.ts:67 |
| No-match glob returns error | pass | `ls: ${pathArg}: No such file or directory` — src/index.ts:257; test:37 |
| Non-glob args unaffected | pass | `expandPathArgs()` passes non-glob args through — src/index.ts:233 |
| `cp dir/ dest` without -r returns `cp: <path>: is a directory` | pass | `try { await this.fs.ls(...); return 'cp: ${src}: is a directory' }` — src/index.ts:585 |
| `cp -r dir/ dest` still works | pass | `copyRecursive()` path — src/index.ts:583 |
| `grep pattern < file.txt` reads file and filters | pass | `inputMatch` handler in `exec()` — src/index.ts:26; test in test/input-redirection-m17.test.ts |
| `wc < file.txt` counts from file content | pass | `execWithStdin` falls through to `execSingle` for wc — src/index.ts:167 |
| `grep pattern < nonexistent` returns error exitCode 1 | pass | `if (r.error) return { output: ..., exitCode: 1 }` — src/index.ts:33 |
| `cmd < infile > outfile` combined works | pass | `remainder` handling in inputMatch — src/index.ts:38 |
| Test count >= 155 | partial | Cannot verify without running `pnpm test` |
| Coverage >= 80% statement, >= 75% branch | partial | Cannot verify without running `pnpm coverage` |

## Gaps

1. **Test count gate** — 155+ tests required. 38 test files exist with substantial coverage but exact count unverifiable without execution.
2. **Coverage gate** — vitest.config.ts thresholds assumed present from m10/m13/m16 work but not re-verified here.

## Global DBB Impact

- All EXPECTED_DBB.md command criteria are implemented in src/index.ts
- Remaining global gaps: wc tab-separator format, exit code 127 vs 2 for unknown commands, coverage CI enforcement
- Global match updated to 88%
