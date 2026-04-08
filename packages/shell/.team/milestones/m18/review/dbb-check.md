# DBB Check — Milestone m18

**Milestone**: wc Format, Unknown Command Exit Code, mkdir Fallback
**Match**: 92%
**Date**: 2026-04-08

## Summary

All 3 DBB criteria pass. wc uses tab separators (confirmed in source lines 966-969). Unknown command returns exit code 2 (exitCodeFor line 223). mkdir .keep fallback works when fs.mkdir is undefined (mkdirOne lines 745-751).

## Criteria Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| wc tab-separated output | pass | Lines 966-969: all wc output uses `\t` separator. Verified with wc-flags-m16.test.ts. |
| unknown command exit code 2 | pass | exitCodeFor() line 223: `/command not found/` → 2. Line 257: default case returns `${cmd}: command not found`. |
| mkdir .keep fallback | pass | mkdirOne() lines 745-751: checks `typeof fs.mkdir`, uses native if available, falls back to `fs.write(path + '/.keep', '')`. Tested in mkdir-no-keep-fallback.test.ts (5/5 pass). |
