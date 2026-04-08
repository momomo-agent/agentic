# Test Result — Include excluded test files in vitest run

## Summary
- Status: BLOCKED
- Implementation not done: `vitest.config.ts` still excludes `src/index.test.ts` and `test/mkdir-find-cd.test.ts`

## Findings
The design requires removing two exclusions from `vitest.config.ts`, but the file still contains:
```
'src/index.test.ts',
'test/mkdir-find-cd.test.ts',
```

## tester-1 findings (2026-04-07)
Attempted to run both excluded files in isolation — both crash with OOM (heap out of memory) regardless of pool config or --max-old-space-size. The files themselves contain no large data; the crash is a vitest infrastructure issue when running these files outside the main singleFork suite.

The implementation (removing exclusions) has NOT been done. vitest.config.ts still excludes both files.

Recommendation: Developer should remove exclusions AND investigate why isolated runs OOM before marking done.
